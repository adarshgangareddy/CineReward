const crypto = require("crypto");
const Movie = require("../models/Movie");
const MovieTeam = require("../models/MovieTeam");
const Ticket = require("../models/Ticket");
const tmdbService = require("../services/tmdbService");
const {
  resolveCountryCurrency,
  formatCurrencyCompact,
} = require("../utils/currencyHelper");
const {
  hashSecret,
  digestSecret,
  formatKeyHint,
} = require("../utils/passwordHash");

function extractYoutubeKey(urlOrKey = "") {
  const s = String(urlOrKey || "").trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m =
    s.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
    s.match(/embed\/([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : "";
}

function generateTeamSecretKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "CR-";
  for (let i = 0; i < 8; i += 1) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

const adminMovieController = {
  listCustomMovies: async (req, res) => {
    try {
      const movies = await Movie.find().sort({ createdAt: -1 }).lean();
      const movieIds = movies.map((m) => m.customId);

      const [teams, ticketAgg] = await Promise.all([
        MovieTeam.find({ assignedMovies: { $in: movieIds } })
          .select("name email secretKeyHint assignedMovies freeTicketsCount")
          .lean(),
        Ticket.aggregate([
          { $match: { movieId: { $in: movieIds } } },
          {
            $group: {
              _id: "$movieId",
              bookings: { $sum: 1 },
              ticketRevenue: { $sum: "$price" },
            },
          },
        ]),
      ]);

      const bookingMap = Object.fromEntries(
        ticketAgg.map((row) => [row._id, row])
      );

      const enriched = movies.map((m) => {
        const linkedTeams = teams.filter((t) =>
          (t.assignedMovies || []).includes(m.customId)
        );
        const stats = bookingMap[m.customId] || { bookings: 0, ticketRevenue: 0 };
        return {
          ...m,
          formattedBudget: formatCurrencyCompact(
            m.totalBudget,
            m.currencyCode,
            m.currencySymbol
          ),
          formattedCollections: formatCurrencyCompact(
            m.totalCollections,
            m.currencyCode,
            m.currencySymbol
          ),
          bookings: stats.bookings,
          ticketRevenue: stats.ticketRevenue,
          assignedTeams: linkedTeams,
        };
      });

      res.json(enriched);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to list custom movies", error: err.message });
    }
  },

  createCustomMovie: async (req, res) => {
    try {
      const payload = req.body || {};
      const title = String(payload.title || "").trim();
      const posterUrl = String(payload.posterUrl || "").trim();
      const overview = String(payload.overview || "").trim();

      if (!title || !posterUrl || !overview) {
        return res.status(400).json({
          message: "Title, Poster image, and Overview description are required.",
        });
      }

      const customId = `cr-${Date.now().toString(36)}-${crypto
        .randomBytes(2)
        .toString("hex")}`;
      const currencyInfo = resolveCountryCurrency(
        payload.country,
        payload.language
      );
      const releaseDate =
        payload.releaseDate || new Date().toISOString().split("T")[0];
      const trailerUrl = String(payload.trailerUrl || "").trim();

      const genresList = Array.isArray(payload.genres)
        ? payload.genres.filter(Boolean)
        : String(payload.genres || "Action, Drama")
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean);

      const movieDoc = await Movie.create({
        customId,
        title,
        tagline: payload.tagline || "In Theatres Worldwide",
        overview,
        mediaType: payload.mediaType === "tv" ? "tv" : "movie",
        releaseDate,
        year: releaseDate.slice(0, 4),
        runtime: Number(payload.runtime) || 145,
        certification: payload.certification || "UA 13+",
        director: payload.director || "CineReward Director",
        language: payload.language || "English",
        originalLanguage: String(
          payload.originalLanguage || payload.language || "en"
        )
          .slice(0, 2)
          .toLowerCase(),
        genres: genresList,
        quality: payload.quality || "IMAX 4K",
        country: currencyInfo.country,
        currencyCode: payload.currencyCode || currencyInfo.code,
        currencySymbol: payload.currencySymbol || currencyInfo.symbol,
        totalBudget: Number(payload.totalBudget) || 0,
        totalCollections: Number(payload.totalCollections) || 0,
        posterUrl,
        backdropUrl: String(payload.backdropUrl || posterUrl).trim(),
        galleryPhotos: Array.isArray(payload.galleryPhotos)
          ? payload.galleryPhotos.filter(Boolean)
          : [],
        cast: Array.isArray(payload.cast)
          ? payload.cast.filter((c) => c && c.name)
          : [],
        trailerUrl,
        trailerKey: extractYoutubeKey(trailerUrl),
        ticketPricing: {
          classic: Number(payload.ticketPricing?.classic) || 240,
          grand: Number(payload.ticketPricing?.grand) || 360,
          majestic: Number(payload.ticketPricing?.majestic) || 540,
        },
        theatres: Array.isArray(payload.theatres)
          ? payload.theatres.filter((t) => t && t.name)
          : [],
        paymentConfig: {
          upi: payload.paymentConfig?.upi !== false,
          card: payload.paymentConfig?.card !== false,
          wallets: payload.paymentConfig?.wallets !== false,
          netBanking: payload.paymentConfig?.netBanking !== false,
          coinsRedeemable: payload.paymentConfig?.coinsRedeemable !== false,
          rewardCoinsPerSeat: Number(payload.paymentConfig?.rewardCoinsPerSeat) || 25,
        },
        rating: Number(payload.rating) || 8.5,
        isPublished: payload.isPublished !== false,
      });

      let provisionedTeam = null;
      const teamEmail = String(payload.teamEmail || "").trim().toLowerCase();
      if (teamEmail) {
        const existingTeam = await MovieTeam.findOne({ email: teamEmail });
        if (existingTeam) {
          if (!existingTeam.assignedMovies.includes(customId)) {
            existingTeam.assignedMovies.push(customId);
            await existingTeam.save();
          }
          provisionedTeam = {
            id: existingTeam._id,
            name: existingTeam.name,
            email: existingTeam.email,
            secretKeyHint: existingTeam.secretKeyHint || "Existing Key",
            newlyGeneratedSecretKey: null,
          };
        } else {
          const rawKey =
            String(payload.teamSecretKey || "").trim() ||
            generateTeamSecretKey();
          const team = await MovieTeam.create({
            name: String(payload.teamName || `${title} Team`).trim(),
            email: teamEmail,
            secretKeyDigest: digestSecret(rawKey),
            secretKeyHash: await hashSecret(rawKey),
            secretKeyHint: formatKeyHint(rawKey),
            assignedMovies: [customId],
            freeTicketsCount: Number(payload.freeTicketsCount) || 10,
          });
          provisionedTeam = {
            id: team._id,
            name: team.name,
            email: team.email,
            secretKeyHint: team.secretKeyHint,
            newlyGeneratedSecretKey: rawKey,
          };
        }
      }

      if (typeof tmdbService.invalidateCustomCache === "function") {
        tmdbService.invalidateCustomCache();
      }

      res.status(201).json({
        message: "Movie published in unified template format!",
        movie: movieDoc,
        team: provisionedTeam,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to publish custom movie", error: err.message });
    }
  },

  deleteCustomMovie: async (req, res) => {
    try {
      const idParam = req.params.id;
      const query = /^[0-9a-fA-F]{24}$/.test(idParam)
        ? { $or: [{ customId: idParam }, { _id: idParam }] }
        : { customId: idParam };
      const deleted = await Movie.findOneAndDelete(query);
      if (!deleted) {
        return res.status(404).json({ message: "Custom movie not found" });
      }
      if (typeof tmdbService.invalidateCustomCache === "function") {
        tmdbService.invalidateCustomCache();
      }
      res.json({ message: "Movie deleted cleanly", customId: deleted.customId });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to delete movie", error: err.message });
    }
  },
};

module.exports = adminMovieController;
