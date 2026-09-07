const Review = require("../models/Review");
const User = require("../models/User");
const Ticket = require("../models/Ticket");
const { groq, model } = require("../services/aiService");

const reviewController = {
  submitReview: async (req, res) => {
    try {
      const { userId, movieId, ticketId, rating, comment, isQuick } = req.body;

      const ticket = await Ticket.findById(ticketId);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });

      // If not a quick review, verify user ownership
      if (!isQuick && (!userId || ticket.userId.toString() !== userId)) {
        return res.status(400).json({ message: "Invalid ticket ownership" });
      }

      if (ticket.reviewSubmitted) {
        return res.status(400).json({ message: "Review already submitted" });
      }

      let aiScore = 50; // Default
      const heuristicScore = Math.min(
        100,
        rating * 7 + (comment.length > 20 ? 30 : 10),
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
                content: `Rating: ${rating}/10. Review: ${comment}`,
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
      // Create and persist review
      const review = new Review({
        userId: ticket.userId, // Use the user from the ticket
        movieId: String(movieId || ticket.movieId),
        rating,
        comment,
        aiScore,
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

  getMovieReviews: async (req, res) => {
    try {
      const reviews = await Review.find({
        movieId: req.params.movieId,
      }).populate("userId", "name profilePicture");
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
