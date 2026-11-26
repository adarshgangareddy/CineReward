const crypto = require("crypto");
const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapMovie, mapMovieTeam, toMovieRow, toMovieTeamRow } = require("../utils/dbMappers");
const tmdbService = require("../services/tmdbService");
const { resolveCountryCurrency, formatCurrencyCompact } = require("../utils/currencyHelper");
const { hashSecret, digestSecret, formatKeyHint } = require("../utils/passwordHash");

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
  let out = String(crypto.randomInt(1, 10));
  for (let i = 0; i < 15; i += 1) {
    out += String(crypto.randomInt(0, 10));
  }
  return out;
}

const adminMovieController = {
  listCustomMovies: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data: moviesRaw } = await db
        .from("movies")
        .select("*")
        .order("created_at", { ascending: false });
      const movies = (moviesRaw || []).map(mapMovie);
      const movieIds = movies.map((m) => m.customId);

      const [{ data: teamsRaw }, ticketQuery] = await Promise.all([
        db
          .from("movie_teams")
          .select("id, name, email, secret_key_hint, assigned_movies, free_tickets_count"),
        movieIds.length > 0
          ? db.from("tickets").select("movie_id, price").in("movie_id", movieIds)
          : Promise.resolve({ data: [] }),
      ]);
      const ticketRows = ticketQuery?.data || [];

      const bookingMap = {};
      for (const t of ticketRows || []) {
        if (!bookingMap[t.movie_id]) bookingMap[t.movie_id] = { bookings: 0, ticketRevenue: 0 };
        bookingMap[t.movie_id].bookings++;
        bookingMap[t.movie_id].ticketRevenue += Number(t.price || 0);
      }

      const enriched = movies.map((m) => {
        const linkedTeams = (teamsRaw || [])
          .filter((t) => (t.assigned_movies || []).includes(m.customId))
          .map(mapMovieTeam);
        const stats = bookingMap[m.customId] || { bookings: 0, ticketRevenue: 0 };
        return {
          ...m,
          formattedBudget: formatCurrencyCompact(m.totalBudget, m.currencyCode, m.currencySymbol),
          formattedCollections: formatCurrencyCompact(m.totalCollections, m.currencyCode, m.currencySymbol),
          bookings: stats.bookings,
          ticketRevenue: stats.ticketRevenue,
          assignedTeams: linkedTeams,
        };
      });

      res.json(enriched);
    } catch (err) {
      res.status(500).json({ message: "Failed to list custom movies", error: err.message });
    }
  },

  createCustomMovie: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const payload = req.body || {};
      const title = String(payload.title || "").trim();
      const posterUrl = String(payload.posterUrl || "").trim();
      const overview = String(payload.overview || "").trim();

      if (!title || !posterUrl || !overview) {
        return res.status(400).json({ message: "Title, Poster image, and Overview description are required." });
      }

      const customId = `cr-${Date.now().toString(36)}-${crypto.randomBytes(2).toString("hex")}`;
      const currencyInfo = resolveCountryCurrency(payload.country, payload.language);
      const releaseDate = payload.releaseDate || new Date().toISOString().split("T")[0];
      const trailerUrl = String(payload.trailerUrl || "").trim();

      const genresList = Array.isArray(payload.genres)
        ? payload.genres.filter(Boolean)
        : String(payload.genres || "Action, Drama")
            .split(",")
            .map((g) => g.trim())
            .filter(Boolean);

      const movieRow = toMovieRow({
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
        originalLanguage: String(payload.originalLanguage || payload.language || "en").slice(0, 2).toLowerCase(),
        genres: genresList,
        quality: payload.quality || "IMAX 4K",
        country: currencyInfo.country,
        currencyCode: payload.currencyCode || currencyInfo.code,
        currencySymbol: payload.currencySymbol || currencyInfo.symbol,
        totalBudget: Number(payload.totalBudget) || 0,
        totalCollections: Number(payload.totalCollections) || 0,
        posterUrl,
        backdropUrl: String(payload.backdropUrl || posterUrl).trim(),
        galleryPhotos: Array.isArray(payload.galleryPhotos) ? payload.galleryPhotos.filter(Boolean) : [],
        cast: Array.isArray(payload.cast) ? payload.cast.filter((c) => c && c.name) : [],
        trailerUrl,
        trailerKey: extractYoutubeKey(trailerUrl),
        ticketPricing: {
          classic: Number(payload.ticketPricing?.classic) || 240,
          grand: Number(payload.ticketPricing?.grand) || 360,
          majestic: Number(payload.ticketPricing?.majestic) || 540,
        },
        theatres: Array.isArray(payload.theatres) ? payload.theatres.filter((t) => t && t.name) : [],
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

      const db = getSupabase();
      const { data: created, error } = await db.from("movies").insert(movieRow).select("*").single();
      if (error) throw error;
      const movieDoc = mapMovie(created);

      let provisionedTeam = null;
      const teamEmail = String(payload.teamEmail || "").trim().toLowerCase();
      if (teamEmail) {
        const { data: existingTeamRows } = await db.from("movie_teams").select("*").eq("email", teamEmail).limit(1);
        if (existingTeamRows && existingTeamRows.length > 0) {
          const existingTeam = mapMovieTeam(existingTeamRows[0]);
          if (!existingTeam.assignedMovies.includes(customId)) {
            const updatedMovies = [...existingTeam.assignedMovies, customId];
            await db.from("movie_teams").update({ assigned_movies: updatedMovies }).eq("id", existingTeam._id);
          }
          provisionedTeam = {
            id: existingTeam._id,
            name: existingTeam.name,
            email: existingTeam.email,
            secretKeyHint: existingTeam.secretKeyHint || "Existing Key",
            newlyGeneratedSecretKey: null,
          };
        } else {
          const rawKey = String(payload.teamSecretKey || "").trim() || generateTeamSecretKey();
          const teamRow = toMovieTeamRow({
            name: String(payload.teamName || `${title} Team`).trim(),
            email: teamEmail,
            secretKeyDigest: digestSecret(rawKey),
            secretKeyHash: await hashSecret(rawKey),
            secretKeyHint: formatKeyHint(rawKey),
            assignedMovies: [customId],
            freeTicketsCount: Number(payload.freeTicketsCount) || 10,
          });
          const { data: newTeam, error: teamErr } = await db.from("movie_teams").insert(teamRow).select("*").single();
          if (teamErr) throw teamErr;
          const team = mapMovieTeam(newTeam);
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
      res.status(500).json({ message: "Failed to publish custom movie", error: err.message });
    }
  },

  deleteCustomMovie: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();
      const idParam = req.params.id;

      // Try by customId first, then by uuid id
      let { data: found } = await db.from("movies").select("id, custom_id").eq("custom_id", idParam).single();
      if (!found) {
        const { data: byUuid } = await db.from("movies").select("id, custom_id").eq("id", idParam).single();
        found = byUuid;
      }
      if (!found) return res.status(404).json({ message: "Custom movie not found" });

      await db.from("movies").delete().eq("id", found.id);

      if (typeof tmdbService.invalidateCustomCache === "function") {
        tmdbService.invalidateCustomCache();
      }
      res.json({ message: "Movie deleted cleanly", customId: found.custom_id });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete movie", error: err.message });
    }
  },
};

module.exports = adminMovieController;
