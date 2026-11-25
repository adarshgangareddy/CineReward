const admin = require("firebase-admin");
const dns = require("dns");
const nodemailer = require("nodemailer");
const { Resend } = require("resend");

if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder("ipv4first");
}

let serviceAccount;
let firebaseReady = false;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    console.log(
      "[Firebase Init] Loading service account from FIREBASE_SERVICE_ACCOUNT_BASE64..."
    );
    serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString(
        "utf8"
      )
    );
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT?.trim().startsWith("{")) {
    console.log(
      "[Firebase Init] Attempting to parse FIREBASE_SERVICE_ACCOUNT from environment..."
    );
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require("./firebase-service-account.json");
  }
} catch (error) {
  console.error(
    "[Firebase Init Error] Service account not loaded:",
    error.message
  );
}

if (serviceAccount) {
  try {
    if (typeof serviceAccount.private_key === "string") {
      serviceAccount.private_key = serviceAccount.private_key.replace(
        /\\n/g,
        "\n"
      );
    }
    if (!admin.apps || admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    }
    firebaseReady = true;
    console.log("[Firebase Init] Admin SDK initialized successfully.");
  } catch (initErr) {
    console.error(
      "[Firebase Init Error] Failed to initialize Admin SDK:",
      initErr.message
    );
  }
}

const getFirebaseAdmin = () => (firebaseReady ? admin : null);

const sendPushNotification = async (tokens, title, body, data = {}) => {
  const validTokens = (Array.isArray(tokens) ? tokens : [tokens]).filter(Boolean);
  if (validTokens.length === 0 || !firebaseReady) {
    return false;
  }

  const stringifiedData = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, String(value ?? "")])
  );
  const frontendUrl = (
    process.env.FRONTEND_URL || "https://cinereward.vercel.app"
  ).replace(/\/$/, "");
  const clickUrl =
    data?.url && String(data.url).startsWith("http")
      ? data.url
      : `${frontendUrl}${data?.url || "/dashboard"}`;

  const message = {
    notification: { title, body },
    data: { ...stringifiedData, title: String(title), body: String(body) },
    webpush: {
      notification: {
        title,
        body,
        icon: `${frontendUrl}/vite.svg`,
        badge: `${frontendUrl}/vite.svg`,
      },
      fcmOptions: { link: clickUrl },
    },
    tokens: validTokens,
  };

  try {
    const messaging = admin.messaging();
    const response =
      typeof messaging.sendEachForMulticast === "function"
        ? await messaging.sendEachForMulticast(message)
        : await messaging.sendMulticast(message);
    console.log(`${response.successCount} FCM message(s) delivered`);
    return response.successCount > 0;
  } catch (error) {
    console.error("Error sending push notification:", error.message);
    return false;
  }
};

const smtpConfigured = Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
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

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const sendEmail = async (to, subject, text, html = null) => {
  if (!to) return false;
  const deliveries = [];

  if (resend) {
    deliveries.push(
      resend.emails
        .send({
          from:
            process.env.RESEND_FROM_EMAIL || "CineReward <onboarding@resend.dev>",
          to: [to],
          subject,
          text,
          ...(html ? { html } : {}),
        })
        .then(({ data, error }) => {
          if (error) throw new Error(error.message);
          console.log("[Resend] Email sent to", to, data?.id);
          return true;
        })
        .catch((error) => {
          console.error("[Resend] Email failed:", error.message);
          return false;
        })
    );
  }

  if (smtpTransporter) {
    deliveries.push(
      smtpTransporter
        .sendMail({
          from: `CineReward <${process.env.SMTP_FROM_EMAIL || process.env.EMAIL_USER}>`,
          to,
          subject,
          text,
          ...(html ? { html } : {}),
        })
        .then((info) => {
          console.log("[SMTP] Email sent to", to, info.messageId);
          return true;
        })
        .catch((error) => {
          console.error("[SMTP] Email failed:", error.message);
          return false;
        })
    );
  }

  if (deliveries.length === 0) {
    console.warn("[Email] Neither Resend nor SMTP configured.");
    return false;
  }

  const results = await Promise.all(deliveries);
  return results.some(Boolean);
};

module.exports = { sendPushNotification, sendEmail, getFirebaseAdmin };
