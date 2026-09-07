const Ticket = require("../models/Ticket");
const User = require("../models/User");
const emailService = require("../services/emailService");
const { sendPushNotification, sendEmail } = require("../config/notifications");
const razorpay = require("../config/razorpay");
const crypto = require("crypto");

const ticketController = {
  bookTicket: async (req, res) => {
    try {
      const {
        userId,
        movieId,
        movieTitle,
        theatre,
        seat,
        date,
        time,
        price,
        useCoins,
      } = req.body;

      const userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ message: "User not found" });

      let coinCost = 0;
      if (useCoins) {
        const seatCount = seat.split(",").length;
        coinCost = seatCount * 100;
        if (userDoc.coins < coinCost) {
          return res
            .status(400)
            .json({ message: "Insufficient coins for this booking" });
        }
      }

      // Calculate an approximate showtimeEnd (say, 3 hours after start time)
      // For a robust system, this should ideally come from TMDB runtime,
      // but a 3hr default is safe for scheduling review prompts.
      const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let startHour = 0;
      let startMinute = 0;
      if (timeMatch) {
        startHour = parseInt(timeMatch[1], 10);
        startMinute = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === "PM" && startHour < 12) startHour += 12;
        if (ampm === "AM" && startHour === 12) startHour = 0;
      } else {
        const startTimeParts = time.split(":");
        startHour = parseInt(startTimeParts[0]) || 0;
        startMinute = parseInt(startTimeParts[1]) || 0;
      }

      const showtimeEnd = new Date(date);
      showtimeEnd.setHours(startHour + 3, startMinute, 0, 0);

      const ticket = new Ticket({
        userId,
        movieId,
        movieTitle,
        seatNumber: seat,
        date,
        time,
        showtimeEnd,
        price,
        theatre,
      });

      await ticket.save();

      const updateData = { $push: { bookedTickets: ticket._id } };
      if (useCoins) {
        updateData.$inc = { coins: -coinCost };
      }

      const user = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
      });

      let pushSent = false;
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        try {
          const title = "CineReward Ticket Confirmed! 🍿";
          const message = `${movieTitle} booked for ${date} at ${time}. Seat(s): ${seat}. Ticket: ${ticket._id}`;
          pushSent = await sendPushNotification(
            user.fcmTokens,
            title,
            message,
            {
              type: "ticket-booked",
              ticketId: ticket._id,
              movieTitle,
              theatre,
              seat,
              date,
              time,
            },
          );
          console.log(
            `[Push] Ticket notification ${pushSent ? "sent" : "failed"} for user ${userId}`,
          );
        } catch (pushErr) {
          console.error("[Push] Failed to trigger notification:", pushErr);
        }
      } else {
        console.warn(
          `[Push] No FCM tokens found for user ${userId}. Booking confirmed but no push notification sent.`,
        );
      }

      // 2. Send Email Notification
      let emailSent = false;
      if (user.email) {
        emailSent = await emailService.sendTicketConfirmation(user.email, {
          movieTitle,
          theatre,
          seat,
          date,
          time,
          price,
          ticketId: ticket._id,
        });
        console.log(
          `[Email] Ticket receipt ${emailSent ? "sent" : "failed"} to ${user.email}`,
        );
      } else {
        console.log(
          `[Email] No email found for user ${userId}, skipping email notification.`,
        );
      }

      res.status(201).json({
        ...ticket.toObject(),
        emailSent,
        pushSent,
      });
    } catch (err) {
      res.status(500).json({ message: "Booking failed", error: err.message });
    }
  },

  getUserTickets: async (req, res) => {
    try {
      const tickets = await Ticket.find({ userId: req.params.userId }).sort({
        createdAt: -1,
      });
      res.json(tickets);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching tickets", error: err.message });
    }
  },

  createOrder: async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body;
      const numericAmount = Number(amount);

      if (!razorpay.keyId || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({
          message: "Online payments are not configured on the server",
        });
      }

      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res
          .status(400)
          .json({ message: "A valid payment amount is required" });
      }

      const options = {
        amount: Math.round(numericAmount * 100), // Amount in paisa
        currency,
        receipt: receipt || `receipt_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json({ ...order, keyId: razorpay.keyId });
    } catch (err) {
      console.error("[Razorpay Order Error]:", err);
      res.status(500).json({
        message: "Order creation failed",
        error: err.message,
        details:
          err.description ||
          err.error?.description ||
          "No specific description",
      });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
        req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        res.json({
          status: "success",
          message: "Payment verified successfully",
        });
      } else {
        res
          .status(400)
          .json({ status: "failure", message: "Payment verification failed" });
      }
    } catch (err) {
      res
        .status(500)
        .json({ message: "Verification error", error: err.message });
    }
  },
};

module.exports = ticketController;
