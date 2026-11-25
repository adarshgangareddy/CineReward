const mongoose = require("mongoose");

const castMemberSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    character: { type: String, default: "Lead Cast", trim: true },
    photoUrl: { type: String, default: "" },
  },
  { _id: false }
);

const theatreSlotSchema = new mongoose.Schema(
  {
    city: { type: String, default: "Bengaluru" },
    name: { type: String, required: true, trim: true },
    area: { type: String, default: "City Center" },
    badge: { type: String, default: "Dolby Atmos • 4K" },
    price: { type: Number, default: 320 },
    slots: [{ type: String }],
  },
  { _id: false }
);

const movieSchema = new mongoose.Schema(
  {
    customId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    tagline: { type: String, default: "" },
    overview: { type: String, required: true },
    mediaType: { type: String, enum: ["movie", "tv"], default: "movie" },
    releaseDate: { type: String, default: "" },
    year: { type: String, default: "" },
    runtime: { type: Number, default: 145 },
    certification: { type: String, default: "UA 13+" },
    director: { type: String, default: "Featured Director" },
    language: { type: String, default: "English" },
    originalLanguage: { type: String, default: "en" },
    genres: [{ type: String }],
    quality: { type: String, default: "IMAX 4K" },

    // Country & Box Office Financials (stored in movie's native country currency)
    country: { type: String, default: "IN" },
    currencyCode: { type: String, default: "INR" },
    currencySymbol: { type: String, default: "₹" },
    totalBudget: { type: Number, default: 0 },
    totalCollections: { type: Number, default: 0 },

    // Visual Assets & Media (Unified Template)
    posterUrl: { type: String, required: true },
    backdropUrl: { type: String, default: "" },
    galleryPhotos: [{ type: String }],
    cast: [castMemberSchema],
    trailerUrl: { type: String, default: "" },
    trailerKey: { type: String, default: "" },

    // Ticket Pricing, Theatres & Payment Config
    ticketPricing: {
      classic: { type: Number, default: 240 },
      grand: { type: Number, default: 360 },
      majestic: { type: Number, default: 540 },
    },
    theatres: [theatreSlotSchema],
    paymentConfig: {
      upi: { type: Boolean, default: true },
      card: { type: Boolean, default: true },
      wallets: { type: Boolean, default: true },
      netBanking: { type: Boolean, default: true },
      coinsRedeemable: { type: Boolean, default: true },
      rewardCoinsPerSeat: { type: Number, default: 25 },
    },
    rating: { type: Number, default: 8.5 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Movie", movieSchema);
