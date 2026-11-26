const nodemailer = require("nodemailer");

// ---- Resend integration (primary) ----
let resendClient = null;
const getResend = () => {
  const key = (process.env.RESEND_API_KEY || "").trim();
  if (!key) return null;
  if (!resendClient) {
    const { Resend } = require("resend");
    resendClient = new Resend(key);
  }
  return resendClient;
};

// ---- SMTP fallback ----
let smtpTransporter = null;
const getSMTPTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  if (!smtpTransporter) {
    smtpTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT || 587),
      secure: Number(process.env.EMAIL_PORT || 587) === 465,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
  }
  return smtpTransporter;
};

/**
 * Core sendEmail — tries Resend first, falls back to SMTP.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const resend = getResend();
  if (resend) {
    try {
      const from =
        (process.env.RESEND_FROM_EMAIL || "").trim() ||
        "CineReward <onboarding@resend.dev>";
      const result = await resend.emails.send({ from, to, subject, html });
      if (result.error) {
        console.error("[Resend] Send error:", result.error.message);
      } else {
        return true;
      }
    } catch (err) {
      console.error("[Resend] Exception:", err.message);
    }
  }

  const smtp = getSMTPTransporter();
  if (smtp) {
    try {
      const from =
        (process.env.SMTP_FROM_EMAIL || "").trim() ||
        process.env.EMAIL_USER ||
        "CineReward <noreply@cinereward.com>";
      await smtp.sendMail({ from, to, subject, html, text });
      return true;
    } catch (err) {
      console.error("[SMTP] Send error:", err.message);
    }
  }

  console.error("[Notifications] No email provider configured — email not sent");
  return false;
};

// ---- Push Notifications (no-op — Firebase removed) ----
// Push is now optional; to re-enable, integrate Web Push or Supabase Realtime.
const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!tokens || tokens.length === 0) return false;
  // No-op: Firebase removed. Register a push provider here if needed.
  return false;
};

module.exports = { sendEmail, sendPushNotification };
