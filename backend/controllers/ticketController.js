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
        city,
        languageFormat,
        seat,
        date,
        time,
        price,
        snacksTotal,
        snacksSummary,
        convenienceFee,
        paymentMethod,
        useCoins,
      } = req.body;

      const userDoc = await User.findById(userId);
      if (!userDoc) return res.status(404).json({ message: "User not found" });

      const seatCount = String(seat || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean).length;
      if (seatCount === 0) {
        return res.status(400).json({ message: "At least one seat is required" });
      }

      const coinDiscount = Number(useCoins) > 0 ? Number(useCoins) : 0;
      if (coinDiscount > 0 && userDoc.coins < coinDiscount) {
        return res
          .status(400)
          .json({ message: "Insufficient coins for this discount" });
      }

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
        startHour = parseInt(startTimeParts[0], 10) || 0;
        startMinute = parseInt(startTimeParts[1], 10) || 0;
      }

      const showtimeEnd = new Date(date);
      showtimeEnd.setHours(startHour + 3, startMinute, 0, 0);

      const ticket = new Ticket({
        userId,
        movieId,
        movieTitle,
        theatre,
        city: city || "",
        languageFormat: languageFormat || "",
        seatNumber: seat,
        date,
        time,
        showtimeEnd,
        price,
        snacksTotal: Number(snacksTotal) || 0,
        snacksSummary: snacksSummary || "",
        convenienceFee: Number(convenienceFee) || 0,
        paymentMethod: paymentMethod || "Online Payment",
      });

      await ticket.save();

      const coinsEarned = Math.max(25, seatCount * 25);
      const netCoinDelta = coinsEarned - coinDiscount;

      const user = await User.findByIdAndUpdate(
        userId,
        {
          $push: { bookedTickets: ticket._id },
          $inc: { coins: netCoinDelta },
        },
        { new: true }
      );

      let pushSent = false;
      if (user.fcmTokens && user.fcmTokens.length > 0) {
        try {
          const title = "CineReward Ticket Confirmed!";
          const message = `${movieTitle} • ${theatre} • ${date} at ${time} • Seats: ${seat}`;
          pushSent = await sendPushNotification(user.fcmTokens, title, message, {
            type: "ticket-booked",
            ticketId: ticket._id,
            movieTitle,
            theatre,
            seat,
            date,
            time,
            url: "/dashboard",
          });
        } catch (pushErr) {
          console.error("[Push] Failed to trigger notification:", pushErr);
        }
      }

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
          coinsEarned,
        });
      }

      res.status(201).json({
        ...ticket.toObject(),
        ticket,
        coinsEarned,
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
