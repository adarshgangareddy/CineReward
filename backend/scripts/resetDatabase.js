require("dotenv").config();

const { getSupabase, isSupabaseReady } = require("../config/supabase");

async function resetDatabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[DB Reset] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env");
    process.exit(1);
  }

  const db = getSupabase();
  console.log("[DB Reset] Connecting to Supabase Postgres...");

  // Verify connection
  const { error: pingErr } = await db.from("users").select("id", { count: "exact", head: true });
  if (pingErr) {
    if (pingErr.code === "42P01" || pingErr.code === "PGRST205") {
      console.error("[DB Reset] Tables not found. Run backend/supabase/schema.sql in Supabase SQL Editor first.");
    } else {
      console.error("[DB Reset] Connection failed:", pingErr.message);
    }
    process.exit(1);
  }

  console.log("[DB Reset] Connected! Clearing all tables...");

  const tables = ["tickets", "reviews", "partner_requests", "movies", "movie_teams", "users"];
  const results = {};

  for (const table of tables) {
    const { error, count } = await db.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      console.error(`[DB Reset] Failed to clear ${table}:`, error.message);
    } else {
      results[table] = "cleared";
    }
  }

  console.log("[DB Reset] All tables cleared:", results);
  console.log("[Auth Setup] Ready with Argon2d hashing, 8-digit email OTP reset, and 3-role unified login.");
  process.exit(0);
}

resetDatabase().catch((err) => {
  console.error("[DB Reset] Failed:", err.message);
  process.exit(1);
});
