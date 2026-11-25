const Review = require("../models/Review");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { classifyReviewWithAI } = require("../services/reviewClassifier");

const reviewController = {
  submitReview: async (req, res) => {
    try {
      const { userId, movieId, ticketId, rating, comment, isQuick } = req.body;

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      if (!isQuick && (!userId || ticket.userId.toString() !== userId)) {
        return res.status(400).json({ message: "Invalid ticket ownership" });
      }

      if (ticket.reviewSubmitted) {
        return res.status(400).json({ message: "Review already submitted" });
      }

      const safeComment = comment || "";
      const { aiScore, aiTags, aiSummary } = await classifyReviewWithAI(
        safeComment,
        rating
      );

      const review = new Review({
        userId: ticket.userId,
        movieId: String(movieId || ticket.movieId),
        rating,
        comment: safeComment,
        aiScore,
        aiTags,
        aiSummary,
        isVerifiedTicket: true,
        commentType: "review",
      });

      await review.save();

      ticket.reviewSubmitted = true;
      await ticket.save();

      res.status(201).json({ review });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Review submission failed", error: err.message });
    }
  },

  submitDiscussion: async (req, res) => {
    try {
      const { movieId, displayName, comment, rating } = req.body;
      const trimmedComment = comment?.trim();

      if (!movieId || !trimmedComment) {
        return res
          .status(400)
          .json({ message: "Movie ID and comment are required" });
      }

      let authorName = displayName?.trim() || "Cinema Fan";
      let userId = null;

      if (req.auth?.id && req.auth.role === "user") {
        userId = req.auth.id;
        const userDoc = await User.findById(userId).select("name");
        if (userDoc?.name) {
          authorName = displayName?.trim() || userDoc.name;
        }
      }

      const numericRating = Math.min(10, Math.max(1, Number(rating) || 8));
      const { aiScore, aiTags, aiSummary } = await classifyReviewWithAI(
        trimmedComment,
        numericRating
      );

      const discussion = new Review({
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
      });

      await discussion.save();
      const populated = await Review.findById(discussion._id).populate(
        "userId",
        "name profilePicture"
      );

      res.status(201).json({ review: populated });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Could not post comment", error: err.message });
    }
  },

  getMovieReviews: async (req, res) => {
    try {
      const reviews = await Review.find({
        movieId: String(req.params.movieId),
      })
        .populate("userId", "name profilePicture")
        .sort({ createdAt: -1 });
      res.json(reviews);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching reviews", error: err.message });
    }
  },

  getTicketDetails: async (req, res) => {
    try {
      const ticket = await Ticket.findById(req.query.ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (ticket.reviewSubmitted)
        return res
          .status(400)
          .json({ message: "Review already submitted for this ticket." });

      res.json({
        movieTitle: ticket.movieTitle,
        movieId: ticket.movieId,
        date: ticket.date,
        theatre: ticket.theatre,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to fetch ticket", error: err.message });
    }
  },
};

module.exports = reviewController;
