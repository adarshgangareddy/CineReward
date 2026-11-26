const cron = require("node-cron");
const { getSupabase, isSupabaseReady } = require("../config/supabase");

// Run every 5 minutes
cron.schedule("*/5 * * * *", async () => {
  console.log("[Cron] Running Review Reminder Job...");
  if (!isSupabaseReady()) return;
  try {
    const db = getSupabase();
    const now = new Date().toISOString();

    const { data: completedTickets } = await db
      .from("tickets")
      .select("*, users(id, name, email)")
      .lte("showtime_end", now)
      .eq("review_submitted", false)
      .eq("review_notification_sent", false);

    if (!completedTickets || completedTickets.length === 0) return;
    console.log(`[Cron] Found ${completedTickets.length} tickets to process.`);

    const emailService = require("../services/emailService");
    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    for (const ticket of completedTickets) {
      const user = ticket.users;
      let notificationSent = false;

      if (user && user.email) {
        const mTitle = ticket.movie_title || "your recent movie";
        const quickReviewUrl = `${frontendUrl}/review/${ticket.id}`;
        try {
          const emailSent = await emailService.sendReviewReminder(user.email, mTitle, quickReviewUrl);
          notificationSent = emailSent || notificationSent;
          console.log(`[Cron] Email ${emailSent ? "sent" : "failed"} for ${mTitle} to: ${user.email}`);
        } catch (emailErr) {
          console.error(`[Cron] Email error for ${user.email}:`, emailErr.message);
        }
      }

      if (notificationSent) {
        await db.from("tickets").update({ review_notification_sent: true }).eq("id", ticket.id);
      }
    }
  } catch (error) {
    console.error("[Cron] Error in review reminder cron:", error);
  }
});
