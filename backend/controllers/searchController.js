const tmdbService = require('../services/tmdbService');

const searchController = {
  search: async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) return res.status(400).json({ message: 'Query is required' });
      const results = await tmdbService.searchMovies(query);
      res.json(results);
    } catch (err) {
      res.status(500).json({ message: 'Search failed', error: err.message });
    }
  }
};

module.exports = searchController;
