const express = require("express");
const mongoose = require("mongoose");
const passport = require("passport");
const authController = require("../controllers/authController");
const router = express.Router();

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message:
        "Google sign-in is temporarily unavailable because the database is not connected. Check MongoDB Atlas network access and try again.",
    });
  }
  next();
};

// Email/Password
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

// Phone Auth
router.post("/phone", authController.handlePhoneAuth);

// Google OAuth
router.get(
  "/google",
  requireDatabase,
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

router.get(
  "/google/callback",
  requireDatabase,
  (req, res, next) => {
    const frontendURL = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    passport.authenticate("google", {
      failureRedirect: `${frontendURL}/login?error=true`,
    })(req, res, (err) => {
      if (err)
        return res
          .status(503)
          .json({
            message:
              "Google sign-in could not reach the database. Check MongoDB Atlas network access and try again.",
          });
      next();
    });
  },
  (req, res) => {
    const token = require("jsonwebtoken").sign(
      { id: req.user._id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );
    // Redirect to frontend (uses FRONTEND_URL in production, localhost in dev)
    const frontendURL = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    res.redirect(
      `${frontendURL}/login?token=${token}&user=${encodeURIComponent(
        JSON.stringify({
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          coins: req.user.coins,
          role: req.user.role,
          profilePicture: req.user.profilePicture,
        }),
      )}`,
    );
  },
);

module.exports = router;
