const mongoose = require('mongoose');

const movieTeamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  secretKey: { type: String, required: true },
  assignedMovies: [{ type: String }], // TMDB Movie IDs
  freeTicketsCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('MovieTeam', movieTeamSchema);
