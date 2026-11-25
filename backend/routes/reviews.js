const express = require('express');
const reviewController = require('../controllers/reviewController');
const { optionalAuthenticate } = require('../middlewares/auth');
const router = express.Router();

router.post('/submit', reviewController.submitReview);
router.post('/discussion', optionalAuthenticate, reviewController.submitDiscussion);
router.get('/movie/:movieId', reviewController.getMovieReviews);
router.get('/ticket-details', reviewController.getTicketDetails);

module.exports = router;
