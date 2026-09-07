const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  movieId: { type: String, required: true }, // Changed to String to support TMDB movie IDs
  movieTitle: { type: String }, // Optional to not break old tickets, but we need it moving forward
  theatre: { type: String, required: true }, // Added theatre string
  seatNumber: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  showtimeEnd: { type: Date }, // Time when the movie actually finishes
  reviewSubmitted: { type: Boolean, default: false },
  reviewNotificationSent: { type: Boolean, default: false },
  price: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
