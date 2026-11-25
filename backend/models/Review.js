const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
    authorName: { type: String, trim: true },
    movieId: { type: String, required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 10 },
    comment: { type: String },
    aiScore: { type: Number, default: 0 },
    aiTags: [{ type: String }],
    aiSummary: { type: String, default: "" },
    isWinner: { type: Boolean, default: false },
    isVerifiedTicket: { type: Boolean, default: false },
    commentType: { type: String, enum: ["review", "discussion"], default: "review" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
