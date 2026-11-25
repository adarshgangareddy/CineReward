const MovieTeam = require("../models/MovieTeam");
const jwt = require("jsonwebtoken");
const Ticket = require("../models/Ticket");
const Review = require("../models/Review");
const User = require("../models/User");
const emailService = require("../services/emailService");
const { sendPushNotification } = require("../config/notifications");
const { groq, model } = require("../services/aiService");
const tmdbService = require("../services/tmdbService");
const {
  classifyReviewWithAI,
  fallbackClassify,
} = require("../services/reviewClassifier");
const {
  hashSecret,
  verifySecret,
  digestSecret,
  formatKeyHint,
} = require("../utils/passwordHash");

const movieTeamController = {
  login: async (req, res) => {
    try {
      const { email, password, secretKey } = req.body;
      const cred = secretKey || password;
      if (!email || !cred) {
        return res
          .status(400)
          .json({ message: "Email and Secret Key (or password) are required" });
      }

      const team = await MovieTeam.findOne({
        email: email.trim().toLowerCase(),
      });
      if (!team) {
        return res
          .status(401)
          .json({ message: "Invalid movie team credentials" });
      }

      const keyOk =
        (team.secretKeyHash && (await verifySecret(team.secretKeyHash, cred))) ||
        (team.secretKey && String(cred).trim() === String(team.secretKey).trim());
      const passOk =
        team.password && (await verifySecret(team.password, password || cred));

      if (!keyOk && !passOk) {
        return res
          .status(401)
          .json({ message: "Invalid movie team credentials" });
      }

      const token = jwt.sign(
        { id: team._id, role: "movie_team" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        id: team._id,
        name: team.name,
        email: team.email,
        assignedMovies: team.assignedMovies,
        freeTicketsCount: team.freeTicketsCount,
        secretKeyHint:
          team.secretKeyHint ||
          (team.secretKey ? formatKeyHint(team.secretKey) : "Configured"),
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
      const team = await MovieTeam.findById(targetId);
      if (!team) {
        return res.status(404).json({ message: "Movie team not found" });
      }

      if (req.auth?.role !== "super_admin") {
        if (!currentCredential) {
          return res.status(400).json({
            message: "Current secret key or password is required to make changes",
          });
        }
        const ok =
          (team.secretKeyHash &&
            (await verifySecret(team.secretKeyHash, currentCredential))) ||
          (team.secretKey &&
            String(currentCredential).trim() === String(team.secretKey).trim()) ||
          (team.password &&
            (await verifySecret(team.password, currentCredential)));
        if (!ok) {
          return res
            .status(401)
            .json({ message: "Current secret key or password is incorrect" });
        }
      }

      const cleanKey = newSecretKey?.trim();
      const cleanPass = newPassword?.trim();
      if (!cleanKey && !cleanPass) {
        return res.status(400).json({
          message: "Provide a new Secret Key or new Password",
        });
      }

      if (cleanKey) {
        if (cleanKey.length < 6) {
          return res
            .status(400)
            .json({ message: "Secret key must be at least 6 characters" });
        }
        const nextDigest = digestSecret(cleanKey);
        const dup = await MovieTeam.findOne({
          _id: { $ne: team._id },
          secretKeyDigest: nextDigest,
        });
        if (dup) {
          return res
            .status(409)
            .json({ message: "This secret key is already in use" });
        }
        team.secretKeyDigest = nextDigest;
        team.secretKeyHash = await hashSecret(cleanKey);
        team.secretKeyHint = formatKeyHint(cleanKey);
        team.secretKey = undefined;
      }

      if (cleanPass) {
        if (cleanPass.length < 6) {
          return res
            .status(400)
            .json({ message: "Password must be at least 6 characters" });
        }
        team.password = await hashSecret(cleanPass);
      }

      await team.save();
      res.json({
        message: "Team credentials updated with Argon2d encryption",
        secretKeyHint: team.secretKeyHint || "Configured",
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to update security credentials", error: err.message });
    }
  },

  updateFreeTickets: async (req, res) => {
    try {
      const { teamId, count } = req.body;
      const team = await MovieTeam.findByIdAndUpdate(
        teamId,
        { freeTicketsCount: count },
        { new: true },
      );
      res.json(team);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating tickets", error: err.message });
    }
  },

  selectWinners: async (req, res) => {
    try {
      const { movieId, teamId } = req.body;
      const team = await MovieTeam.findById(teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });

      if (team.freeTicketsCount <= 0) {
        return res.status(400).json({
          message:
            "No free tickets available to award winners. Please add tickets first.",
        });
      }

      const reviews = await Review.find({
        movieId: String(movieId),
        commentType: { $ne: "discussion" },
      }).populate("userId");
      if (reviews.length === 0)
        return res.status(400).json({ message: "No reviews found" });

      // Lowered threshold to 50 as requested to ensure more reviews qualify
      const filteredReviews = reviews.filter(
        (r) => (r.aiScore || 0) >= 50 && !r.isWinner,
      );
      if (filteredReviews.length === 0)
        return res.status(400).json({
          message:
            "No eligible reviews (AI score >= 50 and not already winners) found",
        });

      // Use AI to select top 3 reviews from filtered ones
      let winners = [];
      const winnerCount = Math.min(3, team.freeTicketsCount);

      // Default fallback: Top reviews by AI score
      winners = [...filteredReviews]
        .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
        .slice(0, winnerCount);

      if (groq) {
        try {
          const prompt = `Based on these movie reviews, select the top ${winnerCount} most helpful, detailed, and genuine reviews. Return only their IDs as a JSON array with the key "winners".\n\nReviews: ${JSON.stringify(filteredReviews.map((r) => ({ id: r._id, comment: r.comment, score: r.aiScore })))}`;
          const response = await groq.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content: "You are a movie critic. Select top reviewers.",
              },
              { role: "user", content: prompt },
            ],
            response_format: { type: "json_object" },
          });
          const result = JSON.parse(response.choices[0].message.content);
          const winnerIds = result.winners || result.ids || [];
          if (winnerIds.length > 0) {
            winners = filteredReviews.filter((r) =>
              winnerIds.includes(r._id.toString()),
            );
          }
        } catch (aiErr) {
          console.error("AI Winner Selection failed:", aiErr.message);
        }
      }

      // Try to find movie title
      let movieTitle = "the movie you reviewed";
      const sampleTicket = await Ticket.findOne({
        movieId: { $in: [movieId, Number(movieId), String(movieId)] },
      });
      if (sampleTicket && sampleTicket.movieTitle)
        movieTitle = sampleTicket.movieTitle;

      for (const winner of winners) {
        winner.isWinner = true;
        await winner.save();

        if (winner.userId) {
          const userId = winner.userId._id || winner.userId;
          const userData = await User.findByIdAndUpdate(
            userId,
            { $inc: { coins: 100 } },
            { new: true },
          );

          if (userData && userData.email) {
            await emailService.sendWinnerNotification(
              userData.email,
              movieTitle,
              100,
            );
          }

          if (userData && userData.fcmTokens?.length > 0) {
            await sendPushNotification(
              userData.fcmTokens,
              "You Won! 🏆 CineReward",
              `Congratulations! Your review for ${movieTitle} won 100 coins!`,
              { type: "coins-awarded", coins: 100 },
            );
          }
        }
      }

      team.freeTicketsCount = Math.max(
        0,
        team.freeTicketsCount - winners.length,
      );
      await team.save();

      res.json({
        message: `Successfully selected ${winners.length} winners`,
        winners,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Winner selection failed", error: err.message });
    }
  },

  awardIndividualCoins: async (req, res) => {
    try {
      const { reviewId, teamId } = req.body;
      const team = await MovieTeam.findById(teamId);
      if (!team) return res.status(404).json({ message: "Team not found" });
      if (team.freeTicketsCount <= 0)
        return res.status(400).json({ message: "No free tickets available" });

      const review = await Review.findById(reviewId).populate("userId");
      if (!review) return res.status(404).json({ message: "Review not found" });
      if (review.isWinner)
        return res
          .status(400)
          .json({ message: "User is already a winner for this review" });

      review.isWinner = true;
      await review.save();

      const userId = review.userId._id || review.userId;
      const userData = await User.findByIdAndUpdate(
        userId,
        { $inc: { coins: 100 } },
        { new: true },
      );

      // Find movie title
      let movieTitle = "the movie you reviewed";
      const sampleTicket = await Ticket.findOne({ movieId: review.movieId });
      if (sampleTicket && sampleTicket.movieTitle)
        movieTitle = sampleTicket.movieTitle;

      if (userData && userData.email) {
        await emailService.sendWinnerNotification(
          userData.email,
          movieTitle,
          100,
        );
      }

      if (userData && userData.fcmTokens?.length > 0) {
        await sendPushNotification(
          userData.fcmTokens,
          "You Won! 🏆 CineReward",
          `Congratulations! Your review for ${movieTitle} won 100 coins!`,
          { type: "coins-awarded", coins: 100 },
        );
      }

      team.freeTicketsCount = Math.max(0, team.freeTicketsCount - 1);
      await team.save();

      res.json({
        message: "Coins awarded successfully",
        winner: userData.name,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to award coins", error: err.message });
    }
  },

  analyzeCommentsWithGroq: async (req, res) => {
    try {
      const { movieId, keywords = "" } = req.body;
      if (!movieId) {
        return res.status(400).json({ message: "movieId is required" });
      }

      const idCandidates = [movieId, String(movieId)];
      if (!Number.isNaN(Number(movieId))) idCandidates.push(Number(movieId));

      const allComments = await Review.find({ movieId: { $in: idCandidates } })
        .populate("userId", "name email profilePicture")
        .sort({ createdAt: -1 })
        .limit(40);

      for (const r of allComments.slice(0, 20)) {
        if (!Array.isArray(r.aiTags) || r.aiTags.length === 0) {
          const classified = await classifyReviewWithAI(r.comment || "", r.rating || 8);
          r.aiScore = classified.aiScore;
          r.aiTags = classified.aiTags;
          r.aiSummary = classified.aiSummary;
          await r.save().catch(() => {});
        }
      }

      const trimmedKw = String(keywords || "").trim();
      let matchedIds = null;

      if (trimmedKw && groq && allComments.length > 0) {
        try {
          const compact = allComments.map((r) => ({
            id: r._id.toString(),
            comment: (r.comment || "").slice(0, 200),
            rating: r.rating,
            tags: r.aiTags || [],
          }));
          const aiResp = await groq.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content:
                  'Filter cinema reviews/comments matching the requested mood or keywords. Return JSON only: { "matchedIds": ["..."], "insight": "brief 1-sentence summary of audience sentiment" }.',
              },
              {
                role: "user",
                content: `Filter keywords: "${trimmedKw}"\nReviews: ${JSON.stringify(compact)}`,
              },
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
            reviews: allComments.map((r) => {
              const obj = r.toObject();
              return {
                ...obj,
                matchesFilter: matchedIds ? matchedIds.has(r._id.toString()) : true,
              };
            }),
          });
        } catch (aiErr) {
          console.warn("[Groq Filter Fallback]:", aiErr.message);
        }
      }

      const terms = trimmedKw
        .toLowerCase()
        .split(/[\s,]+/)
        .filter(Boolean);

      const evaluated = allComments.map((r) => {
        const obj = r.toObject();
        const hay = `${obj.comment || ""} ${(obj.aiTags || []).join(" ")} ${
          obj.aiSummary || ""
        }`.toLowerCase();
        const matchesFilter =
          terms.length === 0 || terms.some((t) => hay.includes(t));
        return { ...obj, matchesFilter };
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
      const idCandidates = [movieId, String(movieId)];
      if (!Number.isNaN(Number(movieId))) idCandidates.push(Number(movieId));

      const [tickets, allComments, team, movieDetails] = await Promise.all([
        Ticket.find({ movieId: { $in: idCandidates } }),
        Review.find({ movieId: { $in: idCandidates } })
          .populate("userId", "name email profilePicture")
          .sort({ createdAt: -1 }),
        MovieTeam.findById(teamId || null),
        tmdbService.getMovieDetails(movieId).catch(() => null),
      ]);

      const hydrateTags = (r) => {
        const obj = r.toObject();
        const fb = fallbackClassify(obj.comment || "", obj.rating || 8);
        return {
          ...obj,
          aiScore: obj.aiScore || fb.aiScore,
          aiTags: Array.isArray(obj.aiTags) && obj.aiTags.length > 0 ? obj.aiTags : fb.aiTags,
          aiSummary: obj.aiSummary || fb.aiSummary,
        };
      };

      const hydratedAll = allComments.map(hydrateTags);
      const recentReviews = hydratedAll.filter(
        (r) => r.commentType !== "discussion" && !r.isWinner
      );
      const pastReviewers = hydratedAll.filter((r) => r.isWinner);
      const ticketRevenue = tickets.reduce((acc, t) => acc + (Number(t.price) || 0), 0);

      res.json({
        ticketCount: tickets.length,
        ticketRevenue,
        recentReviews,
        pastReviewers,
        allComments: hydratedAll,
        movieTitle:
          movieDetails?.title ||
          (tickets.length > 0 ? tickets[0].movieTitle : `Movie ${movieId}`),
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
      res
        .status(500)
        .json({ message: "Error fetching dashboard", error: err.message });
    }
  },
};

module.exports = movieTeamController;
