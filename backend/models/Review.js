const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  authorName: { type: String, trim: true },
  // movieId should reference TMDB/TVMaze movie IDs (string), not an internal Movie ObjectId
  movieId: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 10 },
  comment: { type: String },
  aiScore: { type: Number, default: 0 },
  isWinner: { type: Boolean, default: false },
  isVerifiedTicket: { type: Boolean, default: false },
  commentType: { type: String, enum: ['review', 'discussion'], default: 'review' }
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
