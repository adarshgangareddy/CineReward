const cron = require("node-cron");
const Ticket = require("../models/Ticket");
const { sendPushNotification } = require("../config/notifications");

// Run every 5 minutes ('*/5 * * * *') for faster feedback and testing
cron.schedule("*/5 * * * *", async () => {
  console.log("[Cron] Running Review Reminder Job...");
  try {
    const now = new Date();

    // Find tickets where the movie has finished, review isn't submitted, and we haven't sent a notification
    const completedTickets = await Ticket.find({
      showtimeEnd: { $lte: now },
      reviewSubmitted: false,
      reviewNotificationSent: false,
    }).populate("userId");

    if (completedTickets.length === 0) return;
    console.log(`[Cron] Found ${completedTickets.length} tickets to process.`);

    const emailService = require("../services/emailService");

    for (const ticket of completedTickets) {
      const user = ticket.userId;
      let notificationSent = false;

      if (user && user.fcmTokens && user.fcmTokens.length > 0) {
        const title = "Rate Your Movie Experience! 🎥";
        const mTitle = ticket.movieTitle || "your recent movie";
        const message = `How was ${mTitle}? ⭐ Share your review and earn reward coins!`;

        const frontendUrl = (
          process.env.FRONTEND_URL || "http://localhost:3000"
        ).replace(/\/$/, "");
        const quickReviewUrl = `${frontendUrl}/review/${ticket._id}`;

        notificationSent =
          (await sendPushNotification(user.fcmTokens, title, message, {
            ticketId: ticket._id,
            type: "review_reminder",
          })) || notificationSent;

        // Also send email reminder
        if (user.email) {
          try {
            const emailService = require("../services/emailService");
            const emailSent = await emailService.sendReviewReminder(
              user.email,
              mTitle,
              quickReviewUrl,
            );
            notificationSent = emailSent || notificationSent;
            console.log(
              `[Cron] Resend review email ${emailSent ? "sent" : "failed"} for ${mTitle} to: ${user.email}`,
            );
          } catch (emailErr) {
            console.error(
              `[Cron] Email error for ${user.email}:`,
              emailErr.message,
            );
          }
        }

        console.log(
          `[Cron] Sent push reminder for ${mTitle} to user: ${user._id}`,
        );
      } else if (user && user.email) {
        // If no FCM tokens but has email, still send email
        const mTitle = ticket.movieTitle || "your recent movie";
        const frontendUrl = (
          process.env.FRONTEND_URL || "http://localhost:3000"
        ).replace(/\/$/, "");
        const quickReviewUrl = `${frontendUrl}/review/${ticket._id}`;

        try {
          const emailSent = await emailService.sendReviewReminder(
            user.email,
            mTitle,
            quickReviewUrl,
          );
          notificationSent = emailSent || notificationSent;
          console.log(
            `[Cron] Resend email-only reminder ${emailSent ? "sent" : "failed"} for ${mTitle} to: ${user.email}`,
          );
        } catch (emailErr) {
          console.error(
            `[Cron] Email error for ${user.email}:`,
            emailErr.message,
          );
        }
      }

      // Retry on the next cron run if every configured delivery channel failed.
      if (notificationSent) {
        ticket.reviewNotificationSent = true;
        await ticket.save();
      }
    }
  } catch (error) {
    console.error("[Cron] Error in review reminder cron:", error);
  }
});
