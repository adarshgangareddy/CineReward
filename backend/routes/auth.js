const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");
const { isGoogleConfigured } = require("../middlewares/passport");

const router = express.Router();

const getFrontendURL = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

/*
 * Check whether MongoDB is connected before handling
 * requests that require database access.
 */
const requireDatabase = (req, res, next) => {
  const state = mongoose.connection.readyState;

  if (state !== 1) {
    if (req.path.startsWith("/google")) {
      return res.redirect(`${getFrontendURL()}/login?error=db_unavailable`);
    }
    return res.status(503).json({
      message:
        "Authentication service is temporarily unavailable because the database is not connected.",
      dbState: state,
    });
  }

  next();
};

const requireGoogleStrategy = (req, res, next) => {
  if (!isGoogleConfigured) {
    return res.redirect(`${getFrontendURL()}/login?error=google_not_configured`);
  }
  next();
};

router.get("/db-test", async (req, res) => {
  try {
    const state = mongoose.connection.readyState;

    if (state !== 1) {
      return res.status(503).json({
        connected: false,
        readyState: state,
        message: "MongoDB is not connected",
      });
    }

    await mongoose.connection.db.admin().ping();

    return res.json({
      connected: true,
      readyState: state,
      host: mongoose.connection.host,
      database: mongoose.connection.name,
      message: "MongoDB connection is working",
    });
  } catch (error) {
    console.error("[DB TEST] Error:", error.message);

    return res.status(500).json({
      connected: false,
      message: error.message,
    });
  }
});

// ======================================================
// Email / Password Authentication & Session Verification
// ======================================================

router.post("/signup", requireDatabase, authController.signup);
router.post("/login", requireDatabase, authController.login);
router.get("/me", authenticate, authController.me);
router.post("/forgot-password", requireDatabase, authController.forgotPassword);
router.post("/reset-password", requireDatabase, authController.resetPassword);

// ======================================================
// Phone Authentication
// ======================================================

router.post("/phone", requireDatabase, authController.handlePhoneAuth);

// ======================================================
// Google OAuth
// ======================================================

router.get(
  "/google",
  requireGoogleStrategy,
  requireDatabase,
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  requireGoogleStrategy,
  requireDatabase,
  (req, res, next) => {
    const frontendURL = getFrontendURL();

    passport.authenticate(
      "google",
      {
        failureRedirect: `${frontendURL}/login?error=true`,
      },
      (err, user, info) => {
        if (err) {
          console.error("[Google OAuth] Passport error:", err.message);
          return res.redirect(`${frontendURL}/login?error=oauth_failed`);
        }

        if (!user) {
          console.error("[Google OAuth] No user returned.", info);
          return res.redirect(`${frontendURL}/login?error=true`);
        }

        req.user = user;
        next();
      },
    )(req, res, next);
  },
  (req, res) => {
    const frontendURL = getFrontendURL();
    try {
      if (!req.user) {
        return res.redirect(`${frontendURL}/login?error=true`);
      }

      if (!process.env.JWT_SECRET) {
        return res.redirect(`${frontendURL}/login?error=server_config`);
      }

      const token = jwt.sign(
        {
          id: req.user._id,
          role: req.user.role,
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        },
      );

      const userData = {
        id: req.user._id,
        name: req.user.name,
        username: req.user.username,
        email: req.user.email,
        coins: req.user.coins || 0,
        role: req.user.role || "user",
        profilePicture: req.user.profilePicture || "",
      };

      console.log("[Google OAuth] Login successful for:", req.user.email);

      res.redirect(
        `${frontendURL}/login?token=${encodeURIComponent(
          token,
        )}&user=${encodeURIComponent(JSON.stringify(userData))}`,
      );
    } catch (error) {
      console.error("[Google OAuth] JWT/redirect error:", error);
      return res.redirect(`${frontendURL}/login?error=redirect_failed`);
    }
  },
);

module.exports = router;
