require("dotenv").config();

const express = require("express");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

require("./middlewares/passport");

const { verifySupabaseConnection, isSupabaseReady, getLastDbError } = require("./config/supabase");

const app = express();

// Trust Render's reverse proxy
app.set("trust proxy", 1);

// --------------------------------------------------
// CORS
// --------------------------------------------------

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://cinereward.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^https:\/\/[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.vercel\.app$/.test(origin)
      ) {
        return callback(null, true);
      }
      console.error(`CORS blocked origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

// --------------------------------------------------
// BODY PARSING
// --------------------------------------------------

app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true, limit: "8mb" }));

// --------------------------------------------------
// SESSION (for Passport Google OAuth redirect flow)
// --------------------------------------------------

const isHttpsFrontend = (process.env.FRONTEND_URL || "").startsWith("https://");

app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || "cinereward-session",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production" && isHttpsFrontend,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

// --------------------------------------------------
// PASSPORT
// --------------------------------------------------

app.use(passport.initialize());
app.use(passport.session());

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "CineReward API is running",
    environment: process.env.NODE_ENV || "development",
    uptimeSeconds: Math.round(process.uptime()),
    database: "Supabase Postgres",
    databaseConnected: isSupabaseReady(),
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
    database: "Supabase Postgres",
    databaseConnected: isSupabaseReady(),
    dbError: isSupabaseReady() ? undefined : getLastDbError(),
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// IMPORT ROUTES
// --------------------------------------------------

const authRoutes = require("./routes/auth");
const movieRoutes = require("./routes/movies");
const ticketRoutes = require("./routes/tickets");
const reviewRoutes = require("./routes/reviews");
const adminRoutes = require("./routes/admin");
const searchRoutes = require("./routes/search");
const userRoutes = require("./routes/users");

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

app.use("/api/auth", authRoutes);
app.use("/api/movies", movieRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/users", userRoutes);

// --------------------------------------------------
// 404 HANDLER
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Server error:", err);
  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ success: false, message: "CORS policy blocked this request" });
  }
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

// --------------------------------------------------
// SERVER STARTUP
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");

    // Start Express first so health/movie routes stay available immediately
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[v2.0.0] CineReward API is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);
      const tmdbService = require("./services/tmdbService");
      setTimeout(() => tmdbService.warmCache(), 250);
    });

    // Attempt Supabase connection (non-blocking)
    const result = await verifySupabaseConnection();
    if (result.connected) {
      console.log("[Supabase] Connected to Supabase Postgres successfully.");
      require("./cron/reviewReminders");
      console.log("Review reminder cron initialized");
    } else if (!result.configured) {
      console.warn("[Supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — running in movie-discovery-only mode.");
      console.warn("[Supabase] Auth and DB routes will return 503 until Supabase env vars are configured.");
    } else if (result.schemaMissing) {
      console.error("[Supabase] Connected but tables are missing. Run backend/supabase/schema.sql in Supabase SQL Editor.");
    } else {
      console.error("[Supabase] Connection failed:", result.error);
    }
  } catch (error) {
    console.error("Failed to start CineReward API:", error);
    process.exit(1);
  }
}

startServer();
