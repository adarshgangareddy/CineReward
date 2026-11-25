const tmdbService = require("../services/tmdbService");

const movieController = {
  getHomeFeed: async (req, res) => {
    try {
      const feed = await tmdbService.getHomeFeed();
      res.json(feed);
    } catch (err) {
      console.error("Error in getHomeFeed:", err);
      res.status(500).json({ message: "Error loading home feed", error: err.message });
    }
  },

  getCatalog: async (req, res) => {
    try {
      const result = await tmdbService.getCatalog(req.query);
      res.json(result);
    } catch (err) {
      console.error("Error in getCatalog:", err);
      res.status(500).json({ message: "Error loading catalog", error: err.message });
    }
  },

  getCollections: async (req, res) => {
    try {
      const collections = await tmdbService.getCollections();
      res.json(collections);
    } catch (err) {
      console.error("Error in getCollections:", err);
      res.status(500).json({ message: "Error loading collections", error: err.message });
    }
  },

  getCollectionBySlug: async (req, res) => {
    try {
      const data = await tmdbService.getCollectionBySlug(req.params.slug, req.query);
      if (!data) {
        return res.status(404).json({ message: "Collection not found" });
      }
      res.json(data);
    } catch (err) {
      console.error("Error in getCollectionBySlug:", err);
      res.status(500).json({ message: "Error loading collection", error: err.message });
    }
  },

  getNowPlaying: async (req, res) => {
    try {
      const movies = await tmdbService.getNowPlaying(req.query.page || 1);
      res.json(Array.isArray(movies) ? movies : []);
    } catch (err) {
      console.error("MovieController Error:", err);
      res.status(500).json({ message: "Error fetching from TMDB", error: err.message });
    }
  },

  getPopular: async (req, res) => {
    try {
      const page = req.query.page || 1;
      const movies = await tmdbService.getPopular(page);
      res.json(Array.isArray(movies) ? movies : []);
    } catch (err) {
      console.error("Error in getPopular:", err);
      res.status(500).json({ message: "Error fetching popular movies", error: err.message });
    }
  },

  getDetails: async (req, res) => {
    try {
      const movie = await tmdbService.getMovieDetails(req.params.id, req.query.mediaType);
      res.json(movie);
    } catch (err) {
      res.status(500).json({ message: "Error fetching movie details", error: err.message });
    }
  },

  getSeason: async (req, res) => {
    try {
      const episodes = await tmdbService.getTvSeason(req.params.id, req.params.season);
      res.json(episodes);
    } catch (err) {
      res.status(500).json({ message: "Error fetching season episodes", error: err.message });
    }
  },

  search: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const movies = await tmdbService.searchAll(q, req.query);
      res.json(movies || []);
    } catch (err) {
      res.status(500).json({ message: "Search failed", error: err.message });
    }
  },
};

module.exports = movieController;
