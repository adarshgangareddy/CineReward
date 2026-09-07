const tmdbService = require('../services/tmdbService');

const movieController = {
  getNowPlaying: async (req, res) => {
    try {
      console.log('Fetching Now Playing from TMDB Service...');
      const movies = await tmdbService.getNowPlaying();
      if (!movies || !Array.isArray(movies)) {
        console.error('TMDB Service returned non-array:', movies);
        return res.json([]); // Return empty array instead of 500
      }
      console.log(`Successfully fetched ${movies.length} movies`);
      res.json(movies);
    } catch (err) {
      console.error('MovieController CRITICAL Error:', err);
      res.status(500).json({ message: 'Error fetching from TMDB', error: err.message || 'Unknown error' });
    }
  },

  getDetails: async (req, res) => {
    try {
      const movie = await tmdbService.getMovieDetails(req.params.id);
      const cast = await tmdbService.getMovieCredits(req.params.id);
      res.json({ ...movie, cast });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching from TMDB', error: err.message });
    }
  },

  search: async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const movies = await tmdbService.searchMovies(q);
      res.json(movies || []);
    } catch (err) {
      res.status(500).json({ message: 'Search failed', error: err.message });
    }
  }
};

module.exports = movieController;

// New: popular/discover endpoint
movieController.getPopular = async (req, res) => {
  try {
    // Accept optional page query param, default to 1 and fetch multiple pages server-side
    const page = req.query.page || 1;
    const movies = await tmdbService.getPopular(page, 3);
    res.json(movies);
  } catch (err) {
    console.error('Error in getPopular:', err);
    res.status(500).json({ message: 'Error fetching popular movies', error: err.message });
  }
};
