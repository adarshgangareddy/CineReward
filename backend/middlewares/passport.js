const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapUser, toUserRow } = require("../utils/dbMappers");

const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (isGoogleConfigured) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL:
          process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
        proxy: true,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          if (!isSupabaseReady()) {
            return done(new Error("Database not ready"), null);
          }
          const sb = getSupabase();
          const rawEmail =
            profile.emails && profile.emails.length > 0
              ? profile.emails[0].value
              : null;
          const email = rawEmail ? rawEmail.trim().toLowerCase() : null;
          const profilePicture =
            profile.photos && profile.photos.length > 0
              ? profile.photos[0].value
              : "";

          // Try to find by googleId
          let { data: rows } = await sb
            .from("users")
            .select("*")
            .eq("google_id", profile.id)
            .limit(1);

          let user = rows && rows.length > 0 ? mapUser(rows[0]) : null;

          if (!user && email) {
            const { data: byEmail } = await sb
              .from("users")
              .select("*")
              .eq("email", email)
              .limit(1);
            user = byEmail && byEmail.length > 0 ? mapUser(byEmail[0]) : null;
          }

          if (user) {
            const updates = {};
            if (!user.googleId) updates.google_id = profile.id;
            if (!user.profilePicture && profilePicture)
              updates.profile_picture = profilePicture;
            if (Object.keys(updates).length > 0) {
              const { data: updated } = await sb
                .from("users")
                .update(updates)
                .eq("id", user._id)
                .select("*")
                .single();
              if (updated) user = mapUser(updated);
            }
            return done(null, user);
          }

          // Create new user
          const { data: created, error: createErr } = await sb
            .from("users")
            .insert(
              toUserRow({
                name: profile.displayName || "Google User",
                email: email || undefined,
                googleId: profile.id,
                profilePicture,
                coins: 0,
                role: "user",
              })
            )
            .select("*")
            .single();

          if (createErr) return done(createErr, null);
          return done(null, mapUser(created));
        } catch (err) {
          console.error("[Google Auth Error]:", err);
          return done(err, null);
        }
      }
    )
  );
} else {
  console.error(
    "[Passport Init] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing — Google OAuth login is disabled."
  );
}

passport.serializeUser((user, done) => {
  done(null, user._id || user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    if (!isSupabaseReady()) return done(null, null);
    const sb = getSupabase();
    const { data } = await sb
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    done(null, data ? mapUser(data) : null);
  } catch (err) {
    done(err, null);
  }
});

module.exports = { isGoogleConfigured };
