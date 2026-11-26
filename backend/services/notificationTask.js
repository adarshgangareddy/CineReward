const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapUser } = require("../utils/dbMappers");
const emailService = require("../services/emailService");

const reviewReminderTask = async () => {
  if (!isSupabaseReady()) return 0;
  try {
    const db = getSupabase();
    const cutoff = new Date(Date.now() - 3600 * 1000).toISOString();

    const { data: tickets } = await db
      .from("tickets")
      .select("*, users(id, name, email)")
      .eq("review_submitted", false)
      .lt("created_at", cutoff);

    if (!tickets || tickets.length === 0) return 0;

    const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

    for (const ticket of tickets) {
      const user = ticket.users;
      if (user && user.email) {
        console.log(`Sending reminder to ${user.email}`);
        try {
          await emailService.sendReviewReminder(
            user.email,
            ticket.movie_title || "your recent movie",
            `${frontendUrl}/review/${ticket.id}`
          );
        } catch (e) {
          console.error("Email failed", e.message);
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
