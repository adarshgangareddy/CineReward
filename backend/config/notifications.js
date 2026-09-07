const admin = require("firebase-admin");
const dns = require("dns");
const nodemailer = require("nodemailer");

// Force IPv4 as the default for all network requests (Fixes ENETUNREACH on Render)
// Build trigger: 2026-04-08-00-11
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

let serviceAccount;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log(
      "[Firebase Init] Loading service account from FIREBASE_SERVICE_ACCOUNT_BASE64...",
    );
    serviceAccount = JSON.parse(
      Buffer.from(
        process.env.FIREBASE_SERVICE_ACCOUNT_BASE64,
        "base64",
      ).toString("utf8"),
    );
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim().startsWith("{")) {
    console.log(
      "[Firebase Init] Attempting to parse FIREBASE_SERVICE_ACCOUNT from environment...",
    );
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    console.log(
      "[Firebase Init] FIREBASE_SERVICE_ACCOUNT env not found. Attempting to load from local file...",
    );
    serviceAccount = require("./firebase-service-account.json");
  }
} catch (error) {
  console.error(
    "[Firebase Init Error] Error loading service account:",
    error.message,
  );
  if (process.env.NODE_ENV === "production") {
    console.error(
      "[Firebase Init Error] CRITICAL: Service account missing in production! Notifications will fail.",
    );
  }
}

if (serviceAccount) {
  try {
    if (typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n",
      );
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("[Firebase Init] Admin SDK initialized successfully.");
  } catch (initErr) {
    console.error(
      "[Firebase Init Error] Failed to initialize Admin SDK:",
      initErr.message,
    );
  }
} else {
  console.error(
    "[Firebase Init Error] Firebase Admin SDK could not be initialized: Missing service account credentials.",
  );
}

const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return false;
  if (!serviceAccount) {
    console.error(
      "[Push] Skipped: Firebase Admin credentials are not configured.",
    );
    return false;
  }
  // FCM data payloads require all values to be strings
  const stringifiedData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value)]),
  );
  const message = {
    notification: { title, body },
    data: stringifiedData,
    tokens: tokens, // Send to multiple devices
  };
  try {
    const response = await admin.messaging().sendMulticast(message);
    console.log(response.successCount + " FCM messages sent successfully");
    return response.successCount > 0;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
};

const { Resend } = require("resend");

const smtpConfigured = Boolean(
  process.env.EMAIL_USER && process.env.EMAIL_PASS,
);
const smtpTransporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      family: 4,
      connectionTimeout: 10000,
    })
  : null;

let resend = null;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  console.error(
    "[Resend Init Error] RESEND_API_KEY is missing. Email sending via Resend will be disabled.",
  );
}

const sendEmail = async (to, subject, text) => {
  const deliveries = [];

  if (resend) {
    deliveries.push(
      resend.emails
        .send({
          from:
            process.env.RESEND_FROM_EMAIL ||
            "CineReward <onboarding@resend.dev>",
          to: [to],
          subject,
          text,
        })
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          console.log("[Resend] Email sent to", to, data.id);
          return true;
        })
        .catch((error) => {
          console.error("[Resend] Email failed:", error.message);
          return false;
        }),
    );
  } else {
    console.warn("[Resend] Not configured; skipping email delivery.");
  }

  if (smtpTransporter) {
    deliveries.push(
      smtpTransporter
        .sendMail({
          from: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_USER,
          to,
          subject,
          text,
        })
        .then((info) => {
          console.log("[SMTP] Email sent to", to, info.messageId);
          return true;
        })
        .catch((error) => {
          console.error("[SMTP] Email failed:", error.message);
          return false;
        }),
    );
  } else {
    console.warn("[SMTP] Not configured; skipping email delivery.");
  }

  const results = await Promise.all(deliveries);
  return results.some(Boolean);
};

module.exports = { sendPushNotification, sendEmail };
