const express = require('express');
const ticketController = require('../controllers/ticketController');
const { authenticate, requireSelfOrRole } = require('../middlewares/auth');
const router = express.Router();

const requireSelfOrAdminInBody = requireSelfOrRole((req) => req.body?.userId, 'admin', 'superadmin');
const requireSelfOrAdminInParams = requireSelfOrRole((req) => req.params.userId, 'admin', 'superadmin');

router.post('/book', authenticate, requireSelfOrAdminInBody, ticketController.bookTicket);
router.post('/create-order', authenticate, ticketController.createOrder);
router.post('/verify-payment', authenticate, ticketController.verifyPayment);
router.get('/user/:userId', authenticate, requireSelfOrAdminInParams, ticketController.getUserTickets);

module.exports = router;
