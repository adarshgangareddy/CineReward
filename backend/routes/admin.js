const express = require('express');
const adminController = require('../controllers/adminController');
const movieTeamController = require('../controllers/movieTeamController');
const { authenticate, requireRole, requireSelfOrRole } = require('../middlewares/auth');
const router = express.Router();

const reviewReminderTask = require('../services/notificationTask');

// A movie team may only act on its own teamId; a superadmin may act on any.
const requireOwnTeamOrSuperadmin = requireSelfOrRole(
  (req) => req.body?.teamId || req.query?.teamId || req.params?.teamId,
  'superadmin'
);

// Admin Routes
router.post('/super-login', adminController.superLogin);
router.get('/stats', authenticate, requireRole('superadmin'), adminController.getStats);
router.get('/users', authenticate, requireRole('superadmin'), adminController.getUsers);
router.get('/teams', authenticate, requireRole('superadmin'), adminController.getAllTeams);
router.post('/create-team', authenticate, requireRole('superadmin'), adminController.createMovieTeam);

// Notification Trigger (Admin only)
router.post('/trigger-reminders', authenticate, requireRole('superadmin'), async (req, res) => {
  try {
    const count = await reviewReminderTask();
    res.json({ message: `Reminders sent to ${count} users.` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to send reminders', error: err.message });
  }
});

// Movie Team Routes
router.post('/team/login', movieTeamController.login);
router.get('/team/dashboard/:movieId', authenticate, requireRole('movieteam', 'superadmin'), requireOwnTeamOrSuperadmin, movieTeamController.getTeamDashboard);
router.post('/team/update-tickets', authenticate, requireRole('movieteam', 'superadmin'), requireOwnTeamOrSuperadmin, movieTeamController.updateFreeTickets);
router.post('/team/select-winners', authenticate, requireRole('movieteam', 'superadmin'), requireOwnTeamOrSuperadmin, movieTeamController.selectWinners);
router.post('/team/award-individual', authenticate, requireRole('movieteam', 'superadmin'), requireOwnTeamOrSuperadmin, movieTeamController.awardIndividualCoins);

// Partner Lead Routes
const partnerController = require('../controllers/partnerController');
// Public: prospective partners check status / submit inquiries without an account.
router.get('/partner/status', partnerController.getInquiryStatus);
router.post('/partner/submit', partnerController.submitRequest);
// Admin-only: viewing all leads and changing their status.
router.get('/partner/leads', authenticate, requireRole('superadmin'), partnerController.getRequests);
router.patch('/partner/lead/:id', authenticate, requireRole('superadmin'), partnerController.updateStatus);
// Messaging thread: used by both the (unauthenticated) partner and the admin, gated by knowledge of the request's id.
router.post('/partner/lead/:id/message', partnerController.addMessage);
router.post('/partner/confirm-payment', partnerController.confirmPayment);
router.post('/partner/create-payment-order', partnerController.createPaymentOrder);
router.post('/partner/verify-payment', partnerController.verifyPayment);
router.get('/partner/payment-history', authenticate, requireRole('superadmin'), partnerController.getPaymentHistory);

module.exports = router;
