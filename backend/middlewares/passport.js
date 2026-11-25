const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

const isGoogleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

if (isGoogleConfigured) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        
        if (!user) {
          const rawEmail = profile.emails && profile.emails.length > 0 ? profile.emails[0].value : null;
          const email = rawEmail ? rawEmail.trim().toLowerCase() : null;
          const profilePicture = profile.photos && profile.photos.length > 0 ? profile.photos[0].value : '';
          
          if (email) {
            user = await User.findOne({ email });
          }
          
          if (user) {
            user.googleId = profile.id;
            if (!user.profilePicture && profilePicture) {
              user.profilePicture = profilePicture;
            }
            await user.save();
          } else {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName || 'Google User',
              email: email || undefined,
              profilePicture: profilePicture,
              coins: 0
            });
          }
        }
        
        return done(null, user);
      } catch (err) {
        console.error("Google Auth Error:", err);
        return done(err, null);
      }
    }
  ));
} else {
  console.error('[Passport Init] GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing — Google OAuth login is disabled.');
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = { isGoogleConfigured };
