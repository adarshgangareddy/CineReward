const tmdbService = require("../services/tmdbService");

const searchController = {
  search: async (req, res) => {
    try {
      const q = req.query.query || req.query.q;
      if (!q) return res.status(400).json({ message: "Query is required" });
      const results = await tmdbService.searchAll(q, req.query);
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: "Search failed", error: err.message });
    }
  },
};

module.exports = searchController;
