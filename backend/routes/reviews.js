const express = require('express');
const reviewController = require('../controllers/reviewController');
const router = express.Router();

router.post('/submit', reviewController.submitReview);
router.get('/movie/:movieId', reviewController.getMovieReviews);
router.get('/ticket-details', reviewController.getTicketDetails);

module.exports = router;
