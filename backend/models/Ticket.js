const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    movieId: { type: String, required: true },
    movieTitle: { type: String },
    theatre: { type: String, required: true },
    city: { type: String },
    languageFormat: { type: String },
    seatNumber: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    showtimeEnd: { type: Date },
    reviewSubmitted: { type: Boolean, default: false },
    reviewNotificationSent: { type: Boolean, default: false },
    price: { type: Number, required: true },
    snacksTotal: { type: Number, default: 0 },
    snacksSummary: { type: String, default: "" },
    convenienceFee: { type: Number, default: 0 },
    paymentMethod: { type: String, default: "Online Payment" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);
