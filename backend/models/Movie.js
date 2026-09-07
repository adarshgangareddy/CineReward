const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  poster: { type: String, required: true },
  duration: { type: String, required: true },
  description: { type: String, required: true },
  rating: { type: Number, default: 0 },
  showtimes: [{ type: String }],
  theatre: { type: String, required: true },
  genre: { type: String },
  releaseDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Movie', movieSchema);
