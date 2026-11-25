require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");
const MovieTeam = require("../models/MovieTeam");
const Ticket = require("../models/Ticket");
const Review = require("../models/Review");
const PartnerRequest = require("../models/PartnerRequest");
const Movie = require("../models/Movie");

async function resetDatabase() {
  const targetUri = process.argv.includes("--local")
    ? "mongodb://127.0.0.1:27017/cinereward"
    : process.env.MONGODB_URI;

  if (!targetUri) {
    throw new Error("MONGODB_URI is not configured in backend/.env");
  }

  console.log("[DB Reset] Connecting to database...");
  await mongoose.connect(targetUri, { serverSelectionTimeoutMS: 8000 });

  const [usersRes, teamsRes, ticketsRes, reviewsRes, partnersRes, moviesRes] =
    await Promise.all([
      User.deleteMany({}),
      MovieTeam.deleteMany({}),
      Ticket.deleteMany({}),
      Review.deleteMany({}),
      PartnerRequest.deleteMany({}),
      Movie.deleteMany({}),
    ]);

  await Promise.all([
    User.syncIndexes(),
    MovieTeam.syncIndexes(),
    Ticket.syncIndexes(),
    Review.syncIndexes(),
    PartnerRequest.syncIndexes(),
  ]);

  console.log("[DB Reset] All collections cleared cleanly:", {
    usersRemoved: usersRes.deletedCount,
    movieTeamsRemoved: teamsRes.deletedCount,
    ticketsRemoved: ticketsRes.deletedCount,
    reviewsRemoved: reviewsRes.deletedCount,
    partnerRequestsRemoved: partnersRes.deletedCount,
    moviesRemoved: moviesRes.deletedCount,
  });
  console.log(
    "[Auth Setup] Ready with Argon2d hashing, 8-digit email OTP reset, and 3-role unified login."
  );

  await mongoose.disconnect();
}

resetDatabase()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[DB Reset] Failed:", err.message);
    process.exit(1);
  });

