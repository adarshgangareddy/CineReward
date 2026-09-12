const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    username: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    email: { type: String, unique: true, sparse: true }, // sparse allows multiple null/undefined values
    phone: { type: String, unique: true, sparse: true },
    password: { type: String }, // Optional for Google/Phone Auth users
    googleId: { type: String },
    profilePicture: { type: String },
    coins: { type: Number, default: 0 },
    role: {
      type: String,
      enum: ["user", "admin", "super_admin", "movie_team"],
      default: "user",
    },
    bookedTickets: [{ type: mongoose.Schema.Types.ObjectId, ref: "Ticket" }],
    fcmTokens: [{ type: String }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
