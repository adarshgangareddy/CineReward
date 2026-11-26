const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapTicket, mapUser, toTicketRow } = require("../utils/dbMappers");
const emailService = require("../services/emailService");
const { sendPushNotification } = require("../config/notifications");
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
        razorpayPaymentId,
        razorpayOrderId,
      } = req.body;

      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const db = getSupabase();

      const { data: userRow } = await db.from("users").select("*").eq("id", userId).single();
      if (!userRow) return res.status(404).json({ message: "User not found" });
      const userDoc = mapUser(userRow);

      const seatCount = String(seat || "").split(",").map((s) => s.trim()).filter(Boolean).length;
      if (seatCount === 0) {
        return res.status(400).json({ message: "At least one seat is required" });
      }

      const coinDiscount = Number(useCoins) > 0 ? Number(useCoins) : 0;
      if (coinDiscount > 0 && userDoc.coins < coinDiscount) {
        return res.status(400).json({ message: "Insufficient coins for this discount" });
      }

      const timeMatch = time.match(/(\d+):(\d+)\s*(AM|PM)/i);
      let startHour = 0, startMinute = 0;
      if (timeMatch) {
        startHour = parseInt(timeMatch[1], 10);
        startMinute = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3].toUpperCase();
        if (ampm === "PM" && startHour < 12) startHour += 12;
        if (ampm === "AM" && startHour === 12) startHour = 0;
      } else {
        const parts = time.split(":");
        startHour = parseInt(parts[0], 10) || 0;
        startMinute = parseInt(parts[1], 10) || 0;
      }

      const showtimeEnd = new Date(date);
      showtimeEnd.setHours(startHour + 3, startMinute, 0, 0);

      const ticketRow = toTicketRow({
        userId,
        movieId,
        movieTitle,
        theatre,
        city: city || "",
        languageFormat: languageFormat || "",
        seatNumber: seat,
        date,
        time,
        showtimeEnd: showtimeEnd.toISOString(),
        price,
        snacksTotal: Number(snacksTotal) || 0,
        snacksSummary: snacksSummary || "",
        convenienceFee: Number(convenienceFee) || 0,
        paymentMethod: paymentMethod || "Razorpay",
        razorpayPaymentId: razorpayPaymentId || undefined,
        razorpayOrderId: razorpayOrderId || undefined,
      });

      const { data: createdTicket, error: ticketErr } = await db.from("tickets").insert(ticketRow).select("*").single();
      if (ticketErr) throw ticketErr;
      const ticket = mapTicket(createdTicket);

      const coinsEarned = Math.max(25, seatCount * 25);
      const netCoinDelta = coinsEarned - coinDiscount;

      await db.from("users").update({ coins: (userDoc.coins || 0) + netCoinDelta }).eq("id", userId);

      let emailSent = false;
      if (userDoc.email) {
        emailSent = await emailService.sendTicketConfirmation(userDoc.email, {
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

      res.status(201).json({ ...ticket, ticket, coinsEarned, emailSent, pushSent: false });
    } catch (err) {
      res.status(500).json({ message: "Booking failed", error: err.message });
    }
  },

  getUserTickets: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await getSupabase()
        .from("tickets")
        .select("*")
        .eq("user_id", req.params.userId)
        .order("created_at", { ascending: false });
      res.json((data || []).map(mapTicket));
    } catch (err) {
      res.status(500).json({ message: "Error fetching tickets", error: err.message });
    }
  },

  createOrder: async (req, res) => {
    try {
      const { amount, currency = "INR", receipt } = req.body;
      const numericAmount = Number(amount);

      if (!razorpay.keyId || !process.env.RAZORPAY_KEY_SECRET) {
        return res.status(503).json({ message: "Online payments are not configured on the server" });
      }
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "A valid payment amount is required" });
      }

      const options = {
        amount: Math.round(numericAmount * 100),
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
        details: err.description || err.error?.description || "No specific description",
      });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      if (expectedSignature === razorpay_signature) {
        res.json({ status: "success", message: "Payment verified successfully" });
      } else {
        res.status(400).json({ status: "failure", message: "Payment verification failed" });
      }
    } catch (err) {
      res.status(500).json({ message: "Verification error", error: err.message });
    }
  },
};

module.exports = ticketController;
