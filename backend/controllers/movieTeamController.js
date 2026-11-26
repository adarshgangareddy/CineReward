const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapMovieTeam, mapTicket, mapReview, toMovieTeamRow } = require("../utils/dbMappers");
const jwt = require("jsonwebtoken");
const emailService = require("../services/emailService");
const { sendPushNotification } = require("../config/notifications");
const { groq, model } = require("../services/aiService");
const tmdbService = require("../services/tmdbService");
const { classifyReviewWithAI, fallbackClassify } = require("../services/reviewClassifier");
const { hashSecret, verifySecret, digestSecret, formatKeyHint } = require("../utils/passwordHash");

const movieTeamController = {
  login: async (req, res) => {
    try {
      const { email, password, secretKey } = req.body;
      const cred = secretKey || password;
      if (!email || !cred) {
        return res.status(400).json({ message: "Email and Secret Key (or password) are required" });
      }
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data: rows } = await db.from("movie_teams").select("*").eq("email", email.trim().toLowerCase()).limit(1);
      if (!rows || rows.length === 0) {
        return res.status(401).json({ message: "Invalid movie team credentials" });
      }
      const team = mapMovieTeam(rows[0]);

      const keyOk =
        (team.secretKeyHash && (await verifySecret(team.secretKeyHash, cred))) ||
        (team.secretKey && String(cred).trim() === String(team.secretKey).trim());
      const passOk = team.password && (await verifySecret(team.password, password || cred));

      if (!keyOk && !passOk) {
        return res.status(401).json({ message: "Invalid movie team credentials" });
      }

      const token = jwt.sign({ id: team._id, role: "movie_team" }, process.env.JWT_SECRET, { expiresIn: "7d" });
      res.json({
        id: team._id,
        name: team.name,
        email: team.email,
        assignedMovies: team.assignedMovies,
        freeTicketsCount: team.freeTicketsCount,
        secretKeyHint: team.secretKeyHint || (team.secretKey ? formatKeyHint(team.secretKey) : "Configured"),
        role: "movie_team",
        token,
      });
    } catch (err) {
      res.status(500).json({ message: "Login failed", error: err.message });
    }
  },

  updateSecurity: async (req, res) => {
    try {
      const { teamId, currentCredential, newSecretKey, newPassword } = req.body;
      const targetId = teamId || req.auth?.id;
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data } = await db.from("movie_teams").select("*").eq("id", targetId).single();
      if (!data) return res.status(404).json({ message: "Movie team not found" });
      const team = mapMovieTeam(data);

      if (req.auth?.role !== "super_admin") {
        if (!currentCredential) {
          return res.status(400).json({ message: "Current secret key or password is required to make changes" });
        }
        const ok =
          (team.secretKeyHash && (await verifySecret(team.secretKeyHash, currentCredential))) ||
          (team.secretKey && String(currentCredential).trim() === String(team.secretKey).trim()) ||
          (team.password && (await verifySecret(team.password, currentCredential)));
        if (!ok) {
          return res.status(401).json({ message: "Current secret key or password is incorrect" });
        }
      }

      const cleanKey = newSecretKey?.trim();
      const cleanPass = newPassword?.trim();
      if (!cleanKey && !cleanPass) {
        return res.status(400).json({ message: "Provide a new Secret Key or new Password" });
      }

      const updates = {};
      if (cleanKey) {
        if (cleanKey.length < 6) return res.status(400).json({ message: "Secret key must be at least 6 characters" });
        const nextDigest = digestSecret(cleanKey);
        const { data: dup } = await db.from("movie_teams").select("id").eq("secret_key_digest", nextDigest).neq("id", targetId).limit(1);
        if (dup && dup.length > 0) return res.status(409).json({ message: "This secret key is already in use" });
        updates.secret_key_digest = nextDigest;
        updates.secret_key_hash = await hashSecret(cleanKey);
        updates.secret_key_hint = formatKeyHint(cleanKey);
        updates.secret_key = null;
      }
      if (cleanPass) {
        if (cleanPass.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
        updates.password = await hashSecret(cleanPass);
      }

      const { data: updated } = await db.from("movie_teams").update(updates).eq("id", targetId).select("secret_key_hint").single();
      res.json({
        message: "Team credentials updated with Argon2d encryption",
        secretKeyHint: updated?.secret_key_hint || "Configured",
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to update security credentials", error: err.message });
    }
  },

  updateFreeTickets: async (req, res) => {
    try {
      const { teamId, count } = req.body;
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await getSupabase().from("movie_teams").update({ free_tickets_count: count }).eq("id", teamId).select("*").single();
      res.json(data ? mapMovieTeam(data) : {});
    } catch (err) {
      res.status(500).json({ message: "Error updating tickets", error: err.message });
    }
  },

  selectWinners: async (req, res) => {
    try {
      const { movieId, teamId } = req.body;
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data: teamData } = await db.from("movie_teams").select("*").eq("id", teamId).single();
      if (!teamData) return res.status(404).json({ message: "Team not found" });
      const team = mapMovieTeam(teamData);

      if (team.freeTicketsCount <= 0) {
        return res.status(400).json({ message: "No free tickets available to award winners. Please add tickets first." });
      }

      const { data: reviewRows } = await db
        .from("reviews")
        .select("*, users(id, name, email, profile_picture)")
        .eq("movie_id", String(movieId))
        .neq("comment_type", "discussion");

      if (!reviewRows || reviewRows.length === 0) return res.status(400).json({ message: "No reviews found" });
      const reviews = reviewRows.map((r) => mapReview(r, r.users));

      const filteredReviews = reviews.filter((r) => (r.aiScore || 0) >= 50 && !r.isWinner);
      if (filteredReviews.length === 0) {
        return res.status(400).json({ message: "No eligible reviews (AI score >= 50 and not already winners) found" });
      }

      const winnerCount = Math.min(3, team.freeTicketsCount);
      let winners = [...filteredReviews].sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0)).slice(0, winnerCount);

      if (groq) {
        try {
          const prompt = `Based on these movie reviews, select the top ${winnerCount} most helpful, detailed, and genuine reviews. Return only their IDs as a JSON array with the key "winners".\n\nReviews: ${JSON.stringify(filteredReviews.map((r) => ({ id: r._id, comment: r.comment, score: r.aiScore })))}`;
          const response = await groq.chat.completions.create({
            model,
            messages: [
              { role: "system", content: "You are a movie critic. Select top reviewers." },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          });
          const result = JSON.parse(response.choices[0].message.content);
          const winnerIds = result.winners || result.ids || [];
          if (winnerIds.length > 0) {
            winners = filteredReviews.filter((r) => winnerIds.includes(r._id.toString()));
          }
        } catch (aiErr) {
          console.error("AI Winner Selection failed:", aiErr.message);
        }
      }

      let movieTitle = "the movie you reviewed";
      const { data: sampleTicket } = await db.from("tickets").select("movie_title").eq("movie_id", String(movieId)).limit(1).single();
      if (sampleTicket?.movie_title) movieTitle = sampleTicket.movie_title;

      for (const winner of winners) {
        await db.from("reviews").update({ is_winner: true }).eq("id", winner._id);

        if (winner.userId && (winner.userId.id || winner.userId._id)) {
          const userId = winner.userId.id || winner.userId._id;
          const { data: userData } = await db
            .from("users")
            .update({ coins: db.rpc ? undefined : undefined })
            .eq("id", userId)
            .select("id, name, email, coins")
            .single();

          // Increment coins manually
          if (userData) {
            await db.from("users").update({ coins: (userData.coins || 0) + 100 }).eq("id", userId);
            if (userData.email) {
              await emailService.sendWinnerNotification(userData.email, movieTitle, 100);
            }
          }
        }
      }

      await db.from("movie_teams").update({ free_tickets_count: Math.max(0, team.freeTicketsCount - winners.length) }).eq("id", teamId);
      res.json({ message: `Successfully selected ${winners.length} winners`, winners });
    } catch (err) {
      res.status(500).json({ message: "Winner selection failed", error: err.message });
    }
  },

  awardIndividualCoins: async (req, res) => {
    try {
      const { reviewId, teamId } = req.body;
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data: teamData } = await db.from("movie_teams").select("*").eq("id", teamId).single();
      if (!teamData) return res.status(404).json({ message: "Team not found" });
      const team = mapMovieTeam(teamData);
      if (team.freeTicketsCount <= 0) return res.status(400).json({ message: "No free tickets available" });

      const { data: reviewRow } = await db.from("reviews").select("*, users(id, name, email, coins)").eq("id", reviewId).single();
      if (!reviewRow) return res.status(404).json({ message: "Review not found" });
      const review = mapReview(reviewRow, reviewRow.users);
      if (review.isWinner) return res.status(400).json({ message: "User is already a winner for this review" });

      await db.from("reviews").update({ is_winner: true }).eq("id", reviewId);

      const userInfo = reviewRow.users;
      let winnerName = "Winner";
      if (userInfo) {
        const newCoins = (userInfo.coins || 0) + 100;
        await db.from("users").update({ coins: newCoins }).eq("id", userInfo.id);
        winnerName = userInfo.name || "Winner";
        if (userInfo.email) {
          let movieTitle = "the movie you reviewed";
          const { data: sampleTicket } = await db.from("tickets").select("movie_title").eq("movie_id", review.movieId).limit(1).single();
          if (sampleTicket?.movie_title) movieTitle = sampleTicket.movie_title;
          await emailService.sendWinnerNotification(userInfo.email, movieTitle, 100);
        }
      }

      await db.from("movie_teams").update({ free_tickets_count: Math.max(0, team.freeTicketsCount - 1) }).eq("id", teamId);
      res.json({ message: "Coins awarded successfully", winner: winnerName });
    } catch (err) {
      res.status(500).json({ message: "Failed to award coins", error: err.message });
    }
  },

  analyzeCommentsWithGroq: async (req, res) => {
    try {
      const { movieId, keywords = "" } = req.body;
      if (!movieId) return res.status(400).json({ message: "movieId is required" });
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data: rows } = await db
        .from("reviews")
        .select("*, users(id, name, email, profile_picture)")
        .eq("movie_id", String(movieId))
        .order("created_at", { ascending: false })
        .limit(40);

      const allComments = (rows || []).map((r) => mapReview(r, r.users));

      for (const r of allComments.slice(0, 20)) {
        if (!Array.isArray(r.aiTags) || r.aiTags.length === 0) {
          const classified = await classifyReviewWithAI(r.comment || "", r.rating || 8);
          await db.from("reviews").update({ ai_score: classified.aiScore, ai_tags: classified.aiTags, ai_summary: classified.aiSummary }).eq("id", r._id).catch(() => {});
          r.aiScore = classified.aiScore;
          r.aiTags = classified.aiTags;
          r.aiSummary = classified.aiSummary;
        }
      }

      const trimmedKw = String(keywords || "").trim();
      let matchedIds = null;

      if (trimmedKw && groq && allComments.length > 0) {
        try {
          const compact = allComments.map((r) => ({ id: r._id, comment: (r.comment || "").slice(0, 200), rating: r.rating, tags: r.aiTags || [] }));
          const aiResp = await groq.chat.completions.create({
            model,
            messages: [
              { role: "system", content: 'Filter cinema reviews/comments matching the requested mood or keywords. Return JSON only: { "matchedIds": ["..."], "insight": "brief 1-sentence summary of audience sentiment" }.' },
              { role: "user", content: `Filter keywords: "${trimmedKw}"\nReviews: ${JSON.stringify(compact)}` },
            ],
            response_format: { type: "json_object" },
            max_tokens: 300,
          });
          const parsed = JSON.parse(aiResp.choices?.[0]?.message?.content || "{}");
          if (Array.isArray(parsed.matchedIds)) {
            matchedIds = new Set(parsed.matchedIds);
          }
          return res.json({
            insight: parsed.insight || `Filtered comments by "${trimmedKw}" via Groq AI.`,
            reviews: allComments.map((r) => ({ ...r, matchesFilter: matchedIds ? matchedIds.has(r._id.toString()) : true })),
          });
        } catch (aiErr) {
          console.warn("[Groq Filter Fallback]:", aiErr.message);
        }
      }

      const terms = trimmedKw.toLowerCase().split(/[\s,]+/).filter(Boolean);
      const evaluated = allComments.map((r) => {
        const hay = `${r.comment || ""} ${(r.aiTags || []).join(" ")} ${r.aiSummary || ""}`.toLowerCase();
        const matchesFilter = terms.length === 0 || terms.some((t) => hay.includes(t));
        return { ...r, matchesFilter };
      });

      return res.json({
        insight: terms.length
          ? `Found ${evaluated.filter((r) => r.matchesFilter).length} comments matching "${trimmedKw}"`
          : `Analyzed ${evaluated.length} audience comments & reviews.`,
        reviews: evaluated,
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to analyze comments", error: err.message });
    }
  },

  getTeamDashboard: async (req, res) => {
    try {
      const { movieId } = req.params;
      const { teamId } = req.query;
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const [{ data: ticketRows }, { data: commentRows }, { data: teamData }, movieDetails] = await Promise.all([
        db.from("tickets").select("*").eq("movie_id", String(movieId)),
        db.from("reviews").select("*, users(id, name, email, profile_picture)").eq("movie_id", String(movieId)).order("created_at", { ascending: false }),
        teamId ? db.from("movie_teams").select("*").eq("id", teamId).single() : Promise.resolve({ data: null }),
        tmdbService.getMovieDetails(movieId).catch(() => null),
      ]);

      const tickets = (ticketRows || []).map(mapTicket);
      const allComments = (commentRows || []).map((r) => {
        const mapped = mapReview(r, r.users);
        const fb = fallbackClassify(mapped.comment || "", mapped.rating || 8);
        return {
          ...mapped,
          aiScore: mapped.aiScore || fb.aiScore,
          aiTags: Array.isArray(mapped.aiTags) && mapped.aiTags.length > 0 ? mapped.aiTags : fb.aiTags,
          aiSummary: mapped.aiSummary || fb.aiSummary,
        };
      });

      const recentReviews = allComments.filter((r) => r.commentType !== "discussion" && !r.isWinner);
      const pastReviewers = allComments.filter((r) => r.isWinner);
      const ticketRevenue = tickets.reduce((acc, t) => acc + (Number(t.price) || 0), 0);
      const team = teamData ? mapMovieTeam(teamData) : null;

      res.json({
        ticketCount: tickets.length,
        ticketRevenue,
        recentReviews,
        pastReviewers,
        allComments,
        movieTitle: movieDetails?.title || (tickets.length > 0 ? tickets[0].movieTitle : `Movie ${movieId}`),
        movieFinancials: movieDetails
          ? {
              title: movieDetails.title,
              poster_path: movieDetails.poster_path,
              country: movieDetails.country || "IN",
              currencyCode: movieDetails.currencyCode || "INR",
              currencySymbol: movieDetails.currencySymbol || "₹",
              totalBudget: movieDetails.totalBudget || 0,
              totalCollections: movieDetails.totalCollections || 0,
              formattedBudget: movieDetails.formattedBudget || "Not Disclosed",
              formattedCollections: movieDetails.formattedCollections || "Not Disclosed",
            }
          : null,
        freeTicketsCount: team ? team.freeTicketsCount : 0,
      });
    } catch (err) {
      res.status(500).json({ message: "Error fetching dashboard", error: err.message });
    }
  },
};

module.exports = movieTeamController;
