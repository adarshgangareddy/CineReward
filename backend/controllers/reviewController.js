const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapReview, mapTicket, mapUser, toReviewRow } = require("../utils/dbMappers");
const { classifyReviewWithAI } = require("../services/reviewClassifier");

const reviewController = {
  submitReview: async (req, res) => {
    try {
      const { userId, movieId, ticketId, rating, comment, isQuick } = req.body;
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data: ticketRow } = await db.from("tickets").select("*").eq("id", ticketId).single();
      if (!ticketRow) return res.status(404).json({ message: "Ticket not found" });
      const ticket = mapTicket(ticketRow);

      if (!isQuick && (!userId || ticket.userId !== userId)) {
        return res.status(400).json({ message: "Invalid ticket ownership" });
      }
      if (ticket.reviewSubmitted) {
        return res.status(400).json({ message: "Review already submitted" });
      }

      const safeComment = comment || "";
      const { aiScore, aiTags, aiSummary } = await classifyReviewWithAI(safeComment, rating);

      const { data: created, error } = await db
        .from("reviews")
        .insert(toReviewRow({
          userId: ticket.userId,
          movieId: String(movieId || ticket.movieId),
          rating,
          comment: safeComment,
          aiScore,
          aiTags,
          aiSummary,
          isVerifiedTicket: true,
          commentType: "review",
        }))
        .select("*")
        .single();

      if (error) throw error;

      await db.from("tickets").update({ review_submitted: true }).eq("id", ticketId);

      res.status(201).json({ review: mapReview(created) });
    } catch (err) {
      res.status(500).json({ message: "Review submission failed", error: err.message });
    }
  },

  submitDiscussion: async (req, res) => {
    try {
      const { movieId, displayName, comment, rating } = req.body;
      const trimmedComment = comment?.trim();

      if (!movieId || !trimmedComment) {
        return res.status(400).json({ message: "Movie ID and comment are required" });
      }
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      let authorName = displayName?.trim() || "Cinema Fan";
      let userId = null;

      if (req.auth?.id && req.auth.role === "user") {
        userId = req.auth.id;
        const { data: userRow } = await db.from("users").select("name").eq("id", userId).single();
        if (userRow?.name) authorName = displayName?.trim() || userRow.name;
      }

      const numericRating = Math.min(10, Math.max(1, Number(rating) || 8));
      const { aiScore, aiTags, aiSummary } = await classifyReviewWithAI(trimmedComment, numericRating);

      const { data: created, error } = await db
        .from("reviews")
        .insert(toReviewRow({
          userId: userId || undefined,
          authorName,
          movieId: String(movieId),
          rating: numericRating,
          comment: trimmedComment,
          aiScore,
          aiTags,
          aiSummary,
          isVerifiedTicket: false,
          commentType: "discussion",
        }))
        .select("*, users(id, name, profile_picture)")
        .single();

      if (error) throw error;

      res.status(201).json({ review: mapReview(created, created.users) });
    } catch (err) {
      res.status(500).json({ message: "Could not post comment", error: err.message });
    }
  },

  getMovieReviews: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await getSupabase()
        .from("reviews")
        .select("*, users(id, name, profile_picture)")
        .eq("movie_id", String(req.params.movieId))
        .order("created_at", { ascending: false });
      res.json((data || []).map((r) => mapReview(r, r.users)));
    } catch (err) {
      res.status(500).json({ message: "Error fetching reviews", error: err.message });
    }
  },

  getTicketDetails: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await getSupabase().from("tickets").select("*").eq("id", req.query.ticketId).single();
      if (!data) return res.status(404).json({ message: "Ticket not found" });
      const ticket = mapTicket(data);
      if (ticket.reviewSubmitted) {
        return res.status(400).json({ message: "Review already submitted for this ticket." });
      }
      res.json({ movieTitle: ticket.movieTitle, movieId: ticket.movieId, date: ticket.date, theatre: ticket.theatre });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch ticket", error: err.message });
    }
  },
};

module.exports = reviewController;
