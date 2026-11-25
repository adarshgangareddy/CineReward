const Review = require("../models/Review");
const Ticket = require("../models/Ticket");
const User = require("../models/User");
const { groq, model } = require("../services/aiService");

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

      let aiScore = 50;
      const safeComment = comment || "";
      const heuristicScore = Math.min(
        100,
        rating * 7 + (safeComment.length > 20 ? 30 : 10),
      );

      if (groq) {
        try {
          const response = await groq.chat.completions.create({
            model,
            messages: [
              {
                role: "system",
                content:
                  "Rate the movie review quality 0-100 based on detail, emotion, and authenticity. Output number only.",
              },
              {
                role: "user",
                content: `Rating: ${rating}/10. Review: ${safeComment}`,
              },
            ],
            max_tokens: 5,
          });
          aiScore =
            parseInt(response.choices[0].message.content.trim()) ||
            heuristicScore;
        } catch (err) {
          console.error("AI Analysis failed:", err);
          aiScore = heuristicScore;
        }
      } else {
        aiScore = heuristicScore;
      }

      const review = new Review({
        userId: ticket.userId,
        movieId: String(movieId || ticket.movieId),
        rating,
        comment: safeComment,
        aiScore,
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

      const discussion = new Review({
        userId: userId || undefined,
        authorName,
        movieId: String(movieId),
        rating: numericRating,
        comment: trimmedComment,
        aiScore: 0,
        isVerifiedTicket: false,
        commentType: "discussion",
      });

      await discussion.save();
      const populated = await Review.findById(discussion._id).populate(
        "userId",
        "name profilePicture",
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
        .json({ message: "Error fetching ticket details", error: err.message });
    }
  },
};

module.exports = reviewController;
