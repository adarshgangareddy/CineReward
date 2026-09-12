const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");

const router = express.Router();

/*
 * Check whether MongoDB is connected before handling
 * requests that require database access.
 */
const requireDatabase = (req, res, next) => {
  const state = mongoose.connection.readyState;

  console.log("[DB CHECK]", {
    readyState: state,
    host: mongoose.connection.host || "unknown",
    database: mongoose.connection.name || "unknown",
  });

  if (state !== 1) {
    return res.status(503).json({
      message:
        "Google sign-in is temporarily unavailable because the database is not connected.",
      dbState: state,
    });
  }

  next();
};

router.get("/db-test", async (req, res) => {
  try {
    const state = mongoose.connection.readyState;

    console.log("[DB TEST] readyState:", state);

    if (state !== 1) {
      return res.status(503).json({
        connected: false,
        readyState: state,
        message: "MongoDB is not connected",
      });
    }

    // Actually perform a MongoDB operation
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
// Email / Password Authentication
// ======================================================

router.post("/signup", authController.signup);

router.post("/login", authController.login);

router.post("/forgot-password", authController.forgotPassword);

router.post("/reset-password", authController.resetPassword);

// ======================================================
// Phone Authentication
// ======================================================

router.post("/phone", authController.handlePhoneAuth);

// ======================================================
// Google OAuth
// ======================================================

// Step 1:
// Frontend sends user here:
//
// /api/auth/google
//
// Passport redirects the user to Google.
router.get(
  "/google",
  requireDatabase,
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

// Step 2:
// Google redirects the user here:
//
// /api/auth/google/callback
//
router.get(
  "/google/callback",

  requireDatabase,

  (req, res, next) => {
    const frontendURL = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");

    passport.authenticate(
      "google",
      {
        failureRedirect: `${frontendURL}/login?error=true`,
      },
      (err, user, info) => {
        // Log the actual Passport error.
        if (err) {
          console.error("[Google OAuth] Passport error:", err);
          console.error("[Google OAuth] Error message:", err.message);

          return res.status(503).json({
            message: "Google sign-in failed during authentication.",
          });
        }

        // Google authentication succeeded but no user
        // was returned.
        if (!user) {
          console.error("[Google OAuth] No user returned.", info);

          return res.redirect(`${frontendURL}/login?error=true`);
        }

        // Attach the authenticated user to req.user.
        req.user = user;

        next();
      },
    )(req, res, next);
  },

  // Step 3:
  // Create JWT and redirect the user back to Vercel.
  (req, res) => {
    try {
      if (!req.user) {
        console.error(
          "[Google OAuth] req.user is missing after authentication.",
        );

        const frontendURL = (
          process.env.FRONTEND_URL || "http://localhost:3000"
        ).replace(/\/$/, "");

        return res.redirect(`${frontendURL}/login?error=true`);
      }

      if (!process.env.JWT_SECRET) {
        console.error("[Google OAuth] JWT_SECRET is missing.");

        return res.status(500).json({
          message: "Server authentication configuration error.",
        });
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

      const frontendURL = (
        process.env.FRONTEND_URL || "http://localhost:3000"
      ).replace(/\/$/, "");

      const userData = {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        coins: req.user.coins,
        role: req.user.role,
        profilePicture: req.user.profilePicture,
      };

      console.log("[Google OAuth] Login successful for:", req.user.email);

      res.redirect(
        `${frontendURL}/login?token=${encodeURIComponent(
          token,
        )}&user=${encodeURIComponent(JSON.stringify(userData))}`,
      );
    } catch (error) {
      console.error("[Google OAuth] JWT/redirect error:", error);

      return res.status(500).json({
        message: "Google sign-in completed but redirect failed.",
      });
    }
  },
);

// ======================================================
// Export
// ======================================================

module.exports = router;
