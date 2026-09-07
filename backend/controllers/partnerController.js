const PartnerRequest = require("../models/PartnerRequest");
const emailService = require("../services/emailService");
const crypto = require("crypto");
const User = require("../models/User");
const { sendPushNotification } = require("../config/notifications");

const generatePaymentCode = () =>
  "CR-PAY-" + crypto.randomBytes(4).toString("hex").toUpperCase();

const partnerController = {
  submitRequest: async (req, res) => {
    try {
      const {
        userId,
        name,
        email,
        phone,
        eventType,
        budget,
        description,
        eventDate,
        eventLocation,
        locationUrl,
      } = req.body;
      const request = new PartnerRequest({
        userId,
        name,
        email,
        phone,
        eventType,
        budget,
        description,
        eventDate,
        eventLocation,
        locationUrl,
      });
      await request.save();
      res
        .status(201)
        .json({ message: "Request submitted successfully!", request });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Submission failed", error: err.message });
    }
  },

  getRequests: async (req, res) => {
    try {
      const requests = await PartnerRequest.find().sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching requests", error: err.message });
    }
  },

  updateStatus: async (req, res) => {
    try {
      const { status, message, rejectReason, paymentAmount } = req.body;
      const request = await PartnerRequest.findById(req.params.id);
      if (!request)
        return res.status(404).json({ message: "Request not found" });

      if (status === "Accepted") {
        const code = generatePaymentCode();
        request.paymentCode = code;
        request.paymentAmount = paymentAmount || request.budget;
        request.paymentStatus = "Unpaid";
        request.adminMessage = message || "";
        // 1. Send acceptance email
        try {
          await emailService.sendPartnerAccepted(
            request.email,
            request.name,
            code,
            request.paymentAmount,
            {
              bankName:
                process.env.ADMIN_BANK_NAME ||
                "CineReward Entertainment Pvt Ltd",
              accountNo: process.env.ADMIN_ACCOUNT_NO || "XXXX XXXX 1234",
              ifsc: process.env.ADMIN_IFSC || "CINI0001234",
              upi: process.env.ADMIN_UPI || "admin@cinereward",
            },
          );
        } catch (e) {
          console.error("Accept email failed:", e.message);
        }
      } else if (status === "Negotiating") {
        request.adminMessage = message;
        if (message) request.messages.push({ sender: "admin", text: message });
        // 2. Send negotiate email
        try {
          await emailService.sendPartnerNegotiate(
            request.email,
            request.name,
            message,
          );
        } catch (e) {
          console.error("Negotiate email failed:", e.message);
        }
      } else if (status === "Rejected") {
        request.rejectReason = rejectReason || "No reason specified";
        // 3. Send reject email
        try {
          await emailService.sendPartnerRejected(
            request.email,
            request.name,
            request.rejectReason,
          );
        } catch (e) {
          console.error("Reject email failed:", e.message);
        }
      }

      await request.save();

      // 4. Send Push Notification if linked to user
      if (request.userId) {
        try {
          const user = await User.findById(request.userId);
          if (user && user.fcmTokens && user.fcmTokens.length > 0) {
            let title = "Partner Update — CineReward 🤝";
            let body = "";

            if (status === "Accepted") {
              body = `Great news! Your partnership for ${request.eventType} has been accepted. Pay now to activate!`;
            } else if (status === "Negotiating") {
              body = `We have sent you a message regarding your ${request.eventType} inquiry. Let's talk!`;
            } else if (status === "Rejected") {
              body = `Update on your partnership inquiry for ${request.eventType}. Check details in your email.`;
            }

            if (body) {
              const data = { url: "/partner-status", type: "partner_update" };
              sendPushNotification(user.fcmTokens, title, body, data).catch(
                (e) => console.error("[Partner Push Error]", e),
              );
              console.log(
                `[Partner Push] Triggered for user ${request.userId} (Status: ${status})`,
              );
            }
          }
        } catch (pushErr) {
          console.error("[Partner Push Error]", pushErr);
        }
      }

      res.json(request);
    } catch (err) {
      res.status(500).json({ message: "Update failed", error: err.message });
    }
  },

  addMessage: async (req, res) => {
    try {
      const { text, sender } = req.body;
      const request = await PartnerRequest.findById(req.params.id);
      if (!request)
        return res.status(404).json({ message: "Request not found" });
      request.messages.push({ sender: sender || "partner", text });
      await request.save();
      res.json(request);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Failed to add message", error: err.message });
    }
  },

  createPaymentOrder: async (req, res) => {
    try {
      const { leadId, amount } = req.body;
      const numericAmount = Number(amount);
      const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
      const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

      if (!keyId || !keySecret) {
        return res
          .status(503)
          .json({
            message: "Online payments are not configured on the server",
          });
      }
      if (!leadId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
        return res
          .status(400)
          .json({ message: "A valid payment order is required" });
      }

      const Razorpay = require("razorpay");
      const rzp = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });

      const options = {
        amount: Math.round(numericAmount * 100), // amount in smallest currency unit (paise)
        currency: "INR",
        receipt: `receipt_${leadId.substring(0, 10)}`,
      };

      const order = await rzp.orders.create(options);
      res.json({ ...order, keyId });
    } catch (err) {
      console.error("Razorpay Order Error:", err.message);
      res
        .status(500)
        .json({
          message: "Could not create payment order",
          error: err.message,
        });
    }
  },

  verifyPayment: async (req, res) => {
    try {
      const {
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        leadId,
      } = req.body;
      const crypto = require("crypto");
      const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
      if (!secret) {
        return res
          .status(503)
          .json({
            message: "Online payments are not configured on the server",
          });
      }

      const hmac = crypto.createHmac("sha256", secret);
      hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
      const generated_signature = hmac.digest("hex");

      if (generated_signature === razorpay_signature) {
        const request = await PartnerRequest.findById(leadId);
        if (request) {
          request.paymentStatus = "Paid";
          request.paidAt = new Date();
          request.razorpayPaymentId = razorpay_payment_id;
          await request.save();
          res.json({
            success: true,
            message: "Payment verified successfully!",
          });
        } else {
          res.status(404).json({ message: "Lead not found" });
        }
      } else {
        res.status(400).json({ message: "Invalid signature" });
      }
    } catch (err) {
      res
        .status(500)
        .json({ message: "Verification failed", error: err.message });
    }
  },

  confirmPayment: async (req, res) => {
    try {
      const { paymentCode } = req.body;
      const request = await PartnerRequest.findOne({ paymentCode });
      if (!request)
        return res.status(404).json({ message: "Invalid payment code" });
      request.paymentStatus = "Paid";
      request.paidAt = new Date();
      await request.save();
      res.json({ message: "Payment confirmed!", request });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Payment confirmation failed", error: err.message });
    }
  },

  getInquiryStatus: async (req, res) => {
    try {
      const { email, phone } = req.query;
      if (!email && !phone)
        return res.status(400).json({ message: "Email or Phone required" });

      const query = email ? { email } : { phone };
      const requests = await PartnerRequest.find(query).sort({ createdAt: -1 });
      res.json(requests);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching status", error: err.message });
    }
  },

  getPaymentHistory: async (req, res) => {
    try {
      const payments = await PartnerRequest.find({
        paymentCode: { $exists: true, $ne: null },
      })
        .select(
          "name email eventType paymentCode paymentAmount paymentStatus paidAt createdAt",
        )
        .sort({ createdAt: -1 });
      res.json(payments);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching payments", error: err.message });
    }
  },
};

module.exports = partnerController;
