const { getSupabase, isSupabaseReady } = require("../config/supabase");
const { mapPartnerRequest, toPartnerRequestRow } = require("../utils/dbMappers");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const { sendPushNotification } = require("../config/notifications");

const generatePaymentCode = () => "CR-PAY-" + crypto.randomBytes(4).toString("hex").toUpperCase();

const partnerController = {
  submitRequest: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { userId, name, email, phone, eventType, budget, description, eventDate, eventLocation, locationUrl } = req.body;
      const { data: created, error } = await getSupabase()
        .from("partner_requests")
        .insert(toPartnerRequestRow({ userId, name, email, phone, eventType, budget, description, eventDate, eventLocation, locationUrl }))
        .select("*")
        .single();
      if (error) throw error;
      res.status(201).json({ message: "Request submitted successfully!", request: mapPartnerRequest(created) });
    } catch (err) {
      res.status(500).json({ message: "Submission failed", error: err.message });
    }
  },

  getRequests: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await getSupabase().from("partner_requests").select("*").order("created_at", { ascending: false });
      res.json((data || []).map(mapPartnerRequest));
    } catch (err) {
      res.status(500).json({ message: "Error fetching requests", error: err.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { status, message, rejectReason, paymentAmount } = req.body;
      const db = getSupabase();

      const { data: row } = await db.from("partner_requests").select("*").eq("id", req.params.id).single();
      if (!row) return res.status(404).json({ message: "Request not found" });
      const request = mapPartnerRequest(row);

      const updates = { status };

      if (status === "Accepted") {
        const code = generatePaymentCode();
        updates.payment_code = code;
        updates.payment_amount = paymentAmount || request.budget;
        updates.payment_status = "Unpaid";
        updates.admin_message = message || "";
        try {
          await emailService.sendPartnerAccepted(request.email, request.name, code, updates.payment_amount, {
            bankName: process.env.ADMIN_BANK_NAME || "CineReward Entertainment Pvt Ltd",
            accountNo: process.env.ADMIN_ACCOUNT_NO || "XXXX XXXX 1234",
            ifsc: process.env.ADMIN_IFSC || "CINI0001234",
            upi: process.env.ADMIN_UPI || "admin@cinereward",
          });
        } catch (e) { console.error("Accept email failed:", e.message); }
      } else if (status === "Negotiating") {
        updates.admin_message = message;
        const msgs = Array.isArray(row.messages) ? [...row.messages] : [];
        if (message) msgs.push({ sender: "admin", text: message, createdAt: new Date().toISOString() });
        updates.messages = msgs;
        try { await emailService.sendPartnerNegotiate(request.email, request.name, message); } catch (e) { console.error("Negotiate email failed:", e.message); }
      } else if (status === "Rejected") {
        updates.reject_reason = rejectReason || "No reason specified";
        try { await emailService.sendPartnerRejected(request.email, request.name, updates.reject_reason); } catch (e) { console.error("Reject email failed:", e.message); }
      }

      const { data: updated } = await db.from("partner_requests").update(updates).eq("id", req.params.id).select("*").single();
      res.json(mapPartnerRequest(updated || row));
    } catch (err) {
      res.status(500).json({ message: "Update failed", error: err.message });
    }
  },

  addMessage: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { text, sender } = req.body;
      const db = getSupabase();

      const { data: row } = await db.from("partner_requests").select("*").eq("id", req.params.id).single();
      if (!row) return res.status(404).json({ message: "Request not found" });
      const msgs = Array.isArray(row.messages) ? [...row.messages] : [];
      msgs.push({ sender: sender || "partner", text, createdAt: new Date().toISOString() });

      const { data: updated } = await db.from("partner_requests").update({ messages: msgs }).eq("id", req.params.id).select("*").single();
      res.json(mapPartnerRequest(updated || row));
    } catch (err) {
      res.status(500).json({ message: "Failed to add message", error: err.message });
    }
  },

  createPaymentOrder: async (req, res) => {
    try {
      const { leadId, amount } = req.body;
      const numericAmount = Number(amount);
      const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
      const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

      if (!keyId || !keySecret) {
        return res.status(503).json({ message: "Online payments are not configured on the server" });
      }
      if (!leadId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({ message: "A valid payment order is required" });
      }

      const Razorpay = require("razorpay");
      const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await rzp.orders.create({
        amount: Math.round(numericAmount * 100),
        currency: "INR",
        receipt: `receipt_${leadId.substring(0, 10)}`,
      });
      res.json({ ...order, keyId });
    } catch (err) {
      console.error("Razorpay Order Error:", err.message);
      res.status(500).json({ message: "Could not create payment order", error: err.message });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const { razorpay_payment_id, razorpay_order_id, razorpay_signature, leadId } = req.body;
      const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
      if (!secret) return res.status(503).json({ message: "Online payments are not configured on the server" });

      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest("hex");

      if (generated_signature === razorpay_signature) {
        if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
        const { data: row } = await getSupabase().from("partner_requests").select("id").eq("id", leadId).single();
        if (row) {
          await getSupabase().from("partner_requests").update({
            payment_status: "Paid",
            paid_at: new Date().toISOString(),
            razorpay_payment_id: razorpay_payment_id,
          }).eq("id", leadId);
          res.json({ success: true, message: "Payment verified successfully!" });
        } else {
          res.status(404).json({ message: "Lead not found" });
        }
      } else {
        res.status(400).json({ message: "Invalid signature" });
      }
    } catch (err) {
      res.status(500).json({ message: "Verification failed", error: err.message });
    }
  },

  confirmPayment: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { paymentCode } = req.body;
      const { data: row } = await getSupabase().from("partner_requests").select("*").eq("payment_code", paymentCode).single();
      if (!row) return res.status(404).json({ message: "Invalid payment code" });
      const { data: updated } = await getSupabase()
        .from("partner_requests")
        .update({ payment_status: "Paid", paid_at: new Date().toISOString() })
        .eq("id", row.id)
        .select("*")
        .single();
      res.json({ message: "Payment confirmed!", request: mapPartnerRequest(updated || row) });
    } catch (err) {
      res.status(500).json({ message: "Payment confirmation failed", error: err.message });
    }
  },

  getInquiryStatus: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { email, phone } = req.query;
      if (!email && !phone) return res.status(400).json({ message: "Email or Phone required" });
      const field = email ? "email" : "phone";
      const value = email || phone;
      const { data } = await getSupabase().from("partner_requests").select("*").eq(field, value).order("created_at", { ascending: false });
      res.json((data || []).map(mapPartnerRequest));
    } catch (err) {
      res.status(500).json({ message: "Error fetching status", error: err.message });
    }
  },

  getPaymentHistory: async (req, res) => {
    try {
      if (!isSupabaseReady()) return res.status(503).json({ message: "Database disconnected" });
      const { data } = await getSupabase()
        .from("partner_requests")
        .select("id, name, email, event_type, payment_code, payment_amount, payment_status, paid_at, created_at")
        .not("payment_code", "is", null)
        .order("created_at", { ascending: false });
      res.json((data || []).map(mapPartnerRequest));
    } catch (err) {
      res.status(500).json({ message: "Error fetching payments", error: err.message });
    }
  },
};

module.exports = partnerController;
