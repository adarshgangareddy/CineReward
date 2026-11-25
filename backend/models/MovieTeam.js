const mongoose = require("mongoose");

const movieTeamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String }, // Argon2d hash (optional if signing in via secret key)
    secretKeyHash: { type: String }, // Argon2d hash of the team secret key
    secretKeyDigest: { type: String, unique: true, sparse: true }, // SHA-256 lookup index
    secretKeyHint: { type: String },
    secretKey: { type: String }, // Legacy field avoided for new writes
    assignedMovies: [{ type: String }], // TMDB Movie IDs
    freeTicketsCount: { type: Number, default: 0 },
    resetCodeHash: { type: String },
    resetCodeExpires: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model("MovieTeam", movieTeamSchema);
