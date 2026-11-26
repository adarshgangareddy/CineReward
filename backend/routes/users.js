const express = require("express");
const router = express.Router();
const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapUser } = require("../utils/dbMappers");
const { authenticate, requireSelfOrRole } = require("../middlewares/auth");

const requireSelfOrAdmin = requireSelfOrRole((req) => req.params.userId, "admin", "superadmin");
const requireSelfOrAdminInBody = requireSelfOrRole((req) => req.body?.userId || req.auth?.id, "admin", "superadmin");

// Get user by ID
router.get("/:userId", authenticate, requireSelfOrAdmin, async (req, res) => {
  try {
    if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
    const { data } = await getSupabase()
      .from("users")
      .select("id, name, username, email, phone, coins, role, profile_picture, booked_tickets, created_at")
      .eq("id", req.params.userId)
      .single();
    if (!data) return res.status(404).json({ message: "User not found" });
    res.json(mapUser(data));
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Save/update push token (no-op for now — FCM removed, retained for API compatibility)
router.post("/fcm-token", authenticate, requireSelfOrAdminInBody, async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.body.userId || req.auth.id;
    if (!userId || !fcmToken) {
      return res.status(400).json({ message: "User ID and FCM Token are required" });
    }
    // No-op: Firebase removed. Push notification tokens can be stored in a future push service.
    res.status(200).json({ success: true, message: "FCM Token received (push notifications via Firebase are disabled)" });
  } catch (error) {
    console.error("Error handling FCM token:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
