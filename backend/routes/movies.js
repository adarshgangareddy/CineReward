const express = require('express');
const movieController = require('../controllers/movieController');
const router = express.Router();

router.get('/now-playing', movieController.getNowPlaying);
router.get('/popular', movieController.getPopular);
router.get('/search', movieController.search);
router.get('/:id', movieController.getDetails);

module.exports = router;
