const Ticket = require("../models/Ticket");
const User = require("../models/User");
const emailService = require("../services/emailService");
const { sendPushNotification } = require("../config/notifications");

const reviewReminderTask = async () => {
  try {
    const tickets = await Ticket.find({
      reviewSubmitted: false,
      createdAt: { $lt: new Date(Date.now() - 3600) }, // Reduced for test
    }).populate("userId");

    for (const ticket of tickets) {
      if (ticket.userId && ticket.userId.email) {
        console.log(`Sending reminder to ${ticket.userId.email}`);

        // 1. Email
        try {
          const frontendUrl = (
            process.env.FRONTEND_URL || "http://localhost:3000"
          ).replace(/\/$/, "");
          await emailService.sendReviewReminder(
            ticket.userId.email,
            ticket.movieTitle || "your recent movie",
            `${frontendUrl}/review/${ticket._id}`,
          );
        } catch (e) {
          console.error("Email failed");
        }

        // 2. Push Notification
        if (ticket.userId.fcmTokens && ticket.userId.fcmTokens.length > 0) {
          const title = "Rate Your Movie! 🍿";
          const body = `How was ${ticket.movieTitle || "the movie"}? ⭐ Share your review now and earn rewards!`;
          const data = {
            ticketId: ticket._id.toString(),
            type: "review_reminder",
          };

          sendPushNotification(
            ticket.userId.fcmTokens,
            title,
            body,
            data,
          ).catch((e) => console.error("[Push Error]", e));
        }
      }
    }
    return tickets.length;
  } catch (err) {
    console.error("Review reminder task failed:", err);
    throw err;
  }
};

module.exports = reviewReminderTask;
