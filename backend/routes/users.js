const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { authenticate, requireSelfOrRole } = require("../middlewares/auth");

const requireSelfOrAdmin = requireSelfOrRole(
  (req) => req.params.userId,
  "admin",
  "superadmin",
);
const requireSelfOrAdminInBody = requireSelfOrRole(
  (req) => req.body?.userId || req.auth?.id,
  "admin",
  "superadmin",
);

// Get user by ID
router.get("/:userId", authenticate, requireSelfOrAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Save FCM Token
router.post(
  "/fcm-token",
  authenticate,
  requireSelfOrAdminInBody,
  async (req, res) => {
    try {
      const { fcmToken } = req.body;
      const userId = req.body.userId || req.auth.id;

      if (!userId || !fcmToken) {
        return res
          .status(400)
          .json({ message: "User ID and FCM Token are required" });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Support string arrays for tokens (avoiding duplicates)
      if (!user.fcmTokens) {
        user.fcmTokens = [];
      }

      // Add token if it doesn't already exist for this user
      if (!user.fcmTokens.includes(fcmToken)) {
        user.fcmTokens.push(fcmToken);
        await user.save();
      }

      res
        .status(200)
        .json({ success: true, message: "FCM Token saved successfully" });
    } catch (error) {
      console.error("Error saving FCM token:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

module.exports = router;
