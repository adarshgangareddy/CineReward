require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const session = require("express-session");
const passport = require("passport");

require("./middlewares/passport");

const app = express();

// Trust Render's reverse proxy
app.set("trust proxy", 1);

// --------------------------------------------------
// CORS
// --------------------------------------------------

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin
      // (curl, Postman, mobile apps, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`CORS blocked origin: ${origin}`);

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

// --------------------------------------------------
// BODY PARSING
// --------------------------------------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --------------------------------------------------
// SESSION
// --------------------------------------------------

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  }),
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
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "CORS policy blocked this request",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// --------------------------------------------------
// SERVER STARTUP
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Check required environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is not configured");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    if (!process.env.SESSION_SECRET) {
      throw new Error("SESSION_SECRET is not configured");
    }

    // Connect to MongoDB first
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("Connected to MongoDB Atlas");

    // Start Express server
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[v1.0.2] CineReward API is running on port ${PORT}`);

      console.log(`Environment: ${process.env.NODE_ENV || "development"}`);

      console.log(`Allowed origins: ${allowedOrigins.join(", ")}`);

      // Start cron only after the server and database
      // are successfully initialized.
      require("./cron/reviewReminders");

      console.log("Review reminder cron initialized");
    });
  } catch (error) {
    console.error("Failed to start CineReward API:", error);

    // Exit so Render knows the service failed.
    process.exit(1);
  }
}

startServer();
