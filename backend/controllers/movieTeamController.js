const MovieTeam = require("../models/MovieTeam");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Ticket = require("../models/Ticket");
const Review = require("../models/Review");
const User = require("../models/User");
const emailService = require("../services/emailService");
const { sendPushNotification } = require("../config/notifications");
const { groq, model } = require("../services/aiService");

const movieTeamController = {
  login: async (req, res) => {
    try {
      const { email, password, secretKey } = req.body;
      if (!email || !password || !secretKey) {
        return res
          .status(400)
          .json({ message: "Email, password, and secret key are required" });
      }

      const team = await MovieTeam.findOne({
        email: email.trim().toLowerCase(),
      });
      if (!team || team.secretKey !== secretKey.trim()) {
        return res
          .status(401)
          .json({ message: "Invalid movie team credentials" });
      }

      const passwordMatches = await bcrypt.compare(password, team.password);
      if (!passwordMatches) {
        return res
          .status(401)
          .json({ message: "Invalid movie team credentials" });
      }

      const token = jwt.sign(
        { id: team._id, role: "movie_team" },
        process.env.JWT_SECRET,
        { expiresIn: "7d" },
      );

      res.json({
        id: team._id,
        name: team.name,
        email: team.email,
        assignedMovies: team.assignedMovies,
        freeTicketsCount: team.freeTicketsCount,
        role: "movie_team",
        token,
      });
    } catch (err) {
      res.status(500).json({ message: "Login failed", error: err.message });
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

      const reviews = await Review.find({ movieId }).populate("userId");
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

  getTeamDashboard: async (req, res) => {
    try {
      const { movieId } = req.params;
      const { teamId } = req.query;

      const tickets = await Ticket.find({
        movieId: { $in: [movieId, Number(movieId), String(movieId)] },
      });
      const reviews = await Review.find({
        movieId: { $in: [movieId, Number(movieId), String(movieId)] },
      }).populate("userId", "name email profilePicture");

      // Separate into recent (not winners) and past (winners)
      const recentReviews = reviews
        .filter((r) => !r.isWinner)
        .map((r) => ({
          ...r.toObject(),
          aiScore: r.aiScore || 50,
        }));

      const pastReviewers = reviews
        .filter((r) => r.isWinner)
        .map((r) => ({
          ...r.toObject(),
          aiScore: r.aiScore || 100,
        }));

      const team = await MovieTeam.findById(teamId || null);

      res.json({
        ticketCount: tickets.length,
        recentReviews,
        pastReviewers,
        movieTitle:
          tickets.length > 0
            ? tickets[0].movieTitle
            : reviews.length > 0
              ? "Movie Feedback"
              : "",
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
