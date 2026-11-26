const express = require("express");
const { isSupabaseReady, verifySupabaseConnection, getLastDbError } = require("../config/supabase");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController");
const { authenticate } = require("../middlewares/auth");
const { isGoogleConfigured } = require("../middlewares/passport");

const router = express.Router();

const getFrontendURL = (req) => {
  const configured = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
  const candidate = req?.query?.state || req?.query?.origin;
  if (candidate && typeof candidate === "string") {
    try {
      const u = new URL(candidate);
      if (
        ["localhost", "127.0.0.1"].includes(u.hostname) ||
        u.hostname.endsWith(".vercel.app") ||
        candidate.replace(/\/$/, "") === configured
      ) {
        return candidate.replace(/\/$/, "");
      }
    } catch {
      // ignore invalid origin
    }
  }
  return configured;
};

const requireDatabase = (req, res, next) => {
  if (!isSupabaseReady()) {
    if (req.path.startsWith("/google")) {
      return res.redirect(`${getFrontendURL(req)}/login?error=db_unavailable`);
    }
    return res.status(503).json({
      message:
        "Authentication service is temporarily unavailable because the database is not connected. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
      dbState: "disconnected",
      dbError: getLastDbError(),
    });
  }
  next();
};

const requireGoogleStrategy = (req, res, next) => {
  if (!isGoogleConfigured) {
    return res.redirect(`${getFrontendURL(req)}/login?error=google_not_configured`);
  }
  next();
};

// DB health / status
router.get("/db-test", async (req, res) => {
  try {
    const result = await verifySupabaseConnection();
    if (result.connected) {
      return res.json({ connected: true, provider: "Supabase Postgres", message: "Supabase connection is working" });
    }
    return res.status(503).json({ connected: false, configured: result.configured, schemaMissing: result.schemaMissing, error: result.error || getLastDbError() });
  } catch (error) {
    return res.status(500).json({ connected: false, message: error.message });
  }
});

// Email / Password + unified login
router.post("/signup", requireDatabase, authController.signup);
router.post("/login", authController.login);
router.post("/supabase", requireDatabase, authController.supabaseSocialLogin);
router.get("/me", authenticate, authController.me);
router.post("/forgot-password", requireDatabase, authController.forgotPassword);
router.post("/verify-reset-code", requireDatabase, authController.verifyResetCode);
router.post("/reset-password", requireDatabase, authController.resetPassword);

// Phone authentication
router.post("/phone", requireDatabase, authController.handlePhoneAuth);

// Google OAuth (Passport — stateless JWT)
router.get("/google", requireGoogleStrategy, requireDatabase, (req, res, next) => {
  const originState = getFrontendURL(req);
  passport.authenticate("google", { scope: ["profile", "email"], session: false, state: originState })(req, res, next);
});

router.get(
  "/google/callback",
  requireGoogleStrategy,
  requireDatabase,
  (req, res, next) => {
    const frontendURL = getFrontendURL(req);
    passport.authenticate(
      "google",
      { session: false, failureRedirect: `${frontendURL}/login?error=true` },
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
      }
    )(req, res, next);
  },
  (req, res) => {
    const frontendURL = getFrontendURL(req);
    try {
      if (!req.user) return res.redirect(`${frontendURL}/login?error=true`);
      if (!process.env.JWT_SECRET) return res.redirect(`${frontendURL}/login?error=server_config`);

      const token = jwt.sign({ id: req.user._id, role: req.user.role }, process.env.JWT_SECRET, { expiresIn: "7d" });
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
      res.redirect(`${frontendURL}/login?token=${encodeURIComponent(token)}&user=${encodeURIComponent(JSON.stringify(userData))}`);
    } catch (error) {
      console.error("[Google OAuth] JWT/redirect error:", error);
      return res.redirect(`${frontendURL}/login?error=redirect_failed`);
    }
  }
);

module.exports = router;
