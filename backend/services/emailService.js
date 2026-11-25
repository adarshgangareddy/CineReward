const { sendEmail } = require("../config/notifications");

const getFrontendUrl = () =>
  (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");

const escapeHtml = (val) =>
  String(val ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const wrapEmailHtml = ({ badge, heading, bodyHtml, ctaLabel, ctaUrl, footerNote }) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:24px;background:#07080d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;margin:0 auto;background:#10131e;border:1px solid rgba(255,255,255,0.12);border-radius:20px;overflow:hidden;">
    <tr>
      <td style="padding:24px 28px;border-bottom:1px solid rgba(255,255,255,0.08);background:linear-gradient(135deg,#180c11,#0e111b);">
        <span style="display:inline-block;background:#e50914;color:#ffffff;font-weight:800;font-size:15px;letter-spacing:0.06em;padding:4px 9px;border-radius:4px 0 0 4px;">CINE</span><span style="display:inline-block;border:1px solid rgba(255,255,255,0.9);color:#ffffff;font-weight:800;font-size:15px;letter-spacing:0.06em;padding:3px 9px;border-radius:0 4px 4px 0;">REWARD</span>
        ${badge ? `<p style="margin:12px 0 0;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#f87171;">${escapeHtml(badge)}</p>` : ""}
        <h1 style="margin:6px 0 0;font-size:21px;font-weight:800;color:#ffffff;line-height:1.3;">${escapeHtml(heading)}</h1>
      </td>
    </tr>
    <tr>
      <td style="padding:26px 28px;font-size:14px;line-height:1.65;color:#cbd5e1;">
        ${bodyHtml}
        ${
          ctaLabel && ctaUrl
            ? `<div style="margin-top:24px;"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#e50914;color:#ffffff;text-decoration:none;font-weight:700;font-size:13px;padding:12px 22px;border-radius:10px;">${escapeHtml(ctaLabel)}</a></div>`
            : ""
        }
      </td>
    </tr>
    <tr>
      <td style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.08);background:#0b0d15;font-size:11px;color:#64748b;">
        ${escapeHtml(footerNote || "CineReward Cinema & Rewards Platform • Automated security & booking notification")}
      </td>
    </tr>
  </table>
</body>
</html>`;

const emailService = {
  sendTicketConfirmation: async (userEmail, bookingDetails) => {
    const {
      movieTitle,
      theatre,
      seat,
      date,
      time,
      price,
      ticketId,
      coinsEarned = 25,
    } = bookingDetails;
    const frontendUrl = getFrontendUrl();
    const shortId = String(ticketId || "").slice(-8).toUpperCase();

    const text =
      `Your CineReward M-Ticket is confirmed!\n\n` +
      `MOVIE: ${movieTitle}\n` +
      `THEATRE: ${theatre}\n` +
      `DATE & TIME: ${date} at ${time}\n` +
      `SEAT(S): ${seat}\n` +
      `AMOUNT PAID: INR ${price}\n` +
      `REWARD EARNED: +${coinsEarned} CineCoins\n` +
      `TICKET ID: #${shortId}\n\n` +
      `View your boarding pass: ${frontendUrl}/dashboard`;

    const html = wrapEmailHtml({
      badge: "M-Ticket Confirmed",
      heading: movieTitle || "Cinema Booking Confirmed",
      bodyHtml: `
        <p style="margin:0 0 16px;">Your seats are locked in! Present your Ticket ID at the cinema entrance.</p>
        <table width="100%" cellspacing="0" cellpadding="8" style="background:#0a0d16;border:1px solid rgba(255,255,255,0.08);border-radius:12px;font-size:13px;">
          <tr><td style="color:#94a3b8;">Ticket ID</td><td style="color:#ffffff;font-weight:800;text-align:right;">#${escapeHtml(shortId)}</td></tr>
          <tr><td style="color:#94a3b8;">Cinema &amp; Screen</td><td style="color:#ffffff;font-weight:700;text-align:right;">${escapeHtml(theatre)}</td></tr>
          <tr><td style="color:#94a3b8;">Showtime</td><td style="color:#34d399;font-weight:700;text-align:right;">${escapeHtml(date)} • ${escapeHtml(time)}</td></tr>
          <tr><td style="color:#94a3b8;">Seats</td><td style="color:#ffffff;font-weight:800;text-align:right;">${escapeHtml(seat)}</td></tr>
          <tr><td style="color:#94a3b8;">Total Paid</td><td style="color:#ffffff;font-weight:700;text-align:right;">₹${escapeHtml(price)}</td></tr>
          <tr><td style="color:#94a3b8;">Coins Earned</td><td style="color:#fbbf24;font-weight:700;text-align:right;">+${escapeHtml(coinsEarned)} CineCoins</td></tr>
        </table>
      `,
      ctaLabel: "Open M-Ticket in Dashboard",
      ctaUrl: `${frontendUrl}/dashboard`,
    });

    return sendEmail(userEmail, `CineReward M-Ticket Confirmed — ${movieTitle}`, text, html);
  },

  sendReviewReminder: async (userEmail, movieTitle, quickReviewUrl) => {
    const text =
      `How was ${movieTitle}?\n\nShare your verified review now to compete for +100 CineReward Coins:\n${quickReviewUrl}`;
    const html = wrapEmailHtml({
      badge: "Verified Audience Review",
      heading: `Rate ${movieTitle}`,
      bodyHtml: `
        <p style="margin:0 0 12px;">Your show has wrapped! Share a thoughtful verified review — our AI evaluates helpful feedback for <strong style="color:#fbbf24;">+100 CineReward Coins</strong>.</p>
      `,
      ctaLabel: "Submit Verified Review",
      ctaUrl: quickReviewUrl,
    });
    return sendEmail(userEmail, `Rate your experience: ${movieTitle}`, text, html);
  },

  sendWinnerNotification: async (userEmail, movieTitle, coins) => {
    const frontendUrl = getFrontendUrl();
    const text = `Congratulations! You earned ${coins} Reward Coins for your review of ${movieTitle}.\n\nDashboard: ${frontendUrl}/dashboard`;
    const html = wrapEmailHtml({
      badge: "Reward Winner",
      heading: `You won +${coins} CineCoins!`,
      bodyHtml: `<p style="margin:0;">Congratulations! The studio team selected your verified review for <strong>${escapeHtml(movieTitle)}</strong>. Your <strong>${escapeHtml(coins)} CineReward Coins</strong> are live in your wallet.</p>`,
      ctaLabel: "Check Coin Wallet",
      ctaUrl: `${frontendUrl}/dashboard`,
    });
    return sendEmail(userEmail, `Congratulations! You won ${coins} CineCoins`, text, html);
  },

  sendPartnerAccepted: async (email, name, paymentCode, amount, bankDetails) => {
    const text = `Hi ${name},\n\nYour partnership request has been ACCEPTED!\nReference Code: ${paymentCode}\nAmount: ₹${amount}\nBank: ${bankDetails.bankName}\nAccount: ${bankDetails.accountNo}\nIFSC: ${bankDetails.ifsc}\nUPI: ${bankDetails.upi}`;
    const html = wrapEmailHtml({
      badge: "Partner Approved",
      heading: "CineReward Partnership Accepted",
      bodyHtml: `
        <p style="margin:0 0 14px;">Hi ${escapeHtml(name)}, your partnership request is approved. Include reference code <strong>${escapeHtml(paymentCode)}</strong> in transfer remarks:</p>
        <table width="100%" cellspacing="0" cellpadding="6" style="background:#0a0d16;border-radius:10px;font-size:13px;">
          <tr><td style="color:#94a3b8;">Reference</td><td style="color:#fff;font-weight:700;text-align:right;">${escapeHtml(paymentCode)}</td></tr>
          <tr><td style="color:#94a3b8;">Amount</td><td style="color:#34d399;font-weight:700;text-align:right;">₹${escapeHtml(amount)}</td></tr>
          <tr><td style="color:#94a3b8;">Bank / IFSC</td><td style="color:#fff;text-align:right;">${escapeHtml(bankDetails.bankName)} (${escapeHtml(bankDetails.ifsc)})</td></tr>
          <tr><td style="color:#94a3b8;">Account</td><td style="color:#fff;text-align:right;">${escapeHtml(bankDetails.accountNo)}</td></tr>
          <tr><td style="color:#94a3b8;">UPI</td><td style="color:#fff;text-align:right;">${escapeHtml(bankDetails.upi)}</td></tr>
        </table>`,
      ctaLabel: "Track Partner Status",
      ctaUrl: `${getFrontendUrl()}/partner-status`,
    });
    return sendEmail(email, "CineReward Partnership Accepted!", text, html);
  },

  sendPartnerNegotiate: async (email, name, adminMessage) => {
    const url = `${getFrontendUrl()}/partner-status`;
    const text = `Hi ${name},\n\nMessage regarding your partnership inquiry:\n"${adminMessage}"\n\nView details: ${url}`;
    const html = wrapEmailHtml({
      badge: "Partnership Update",
      heading: "Message from CineReward Team",
      bodyHtml: `<p>Hi ${escapeHtml(name)}, our admin team sent an update:</p><blockquote style="margin:12px 0;padding:12px 16px;background:#0a0d16;border-left:3px solid #e50914;border-radius:6px;color:#fff;">${escapeHtml(adminMessage)}</blockquote>`,
      ctaLabel: "View Inquiry Status",
      ctaUrl: url,
    });
    return sendEmail(email, "Message from CineReward Team", text, html);
  },

  sendPartnerRejected: async (email, name, reason) => {
    const url = `${getFrontendUrl()}/list-your-show`;
    const text = `Hi ${name},\n\nPartnership inquiry update: ${reason}\nSubmit a new request: ${url}`;
    const html = wrapEmailHtml({
      badge: "Partnership Update",
      heading: "Inquiry Status Update",
      bodyHtml: `<p>Hi ${escapeHtml(name)}, thank you for reaching out. Reason: <strong>${escapeHtml(reason)}</strong></p>`,
      ctaLabel: "Submit Updated Inquiry",
      ctaUrl: url,
    });
    return sendEmail(email, "Partnership Update — CineReward", text, html);
  },

  sendResetCodeEmail: async (email, code, accountRole = "user") => {
    const isTeam = accountRole === "movie_team";
    const actionTarget = isTeam
      ? "Movie Team Secret Key or Password"
      : "CineReward Account Password";
    const text =
      `Your 8-digit CineReward security verification code is: ${code}\n\n` +
      `Enter this code along with your new ${actionTarget} to complete recovery. Expires in 15 minutes.`;

    const html = wrapEmailHtml({
      badge: "Security Verification",
      heading: `Reset ${actionTarget}`,
      bodyHtml: `
        <p style="margin:0 0 16px;">Use the 8-digit verification code below to reset your ${escapeHtml(actionTarget.toLowerCase())}:</p>
        <div style="background:#070910;border:1px solid rgba(229,9,20,0.45);border-radius:14px;padding:18px;text-align:center;margin:16px 0;">
          <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:30px;font-weight:800;letter-spacing:0.22em;color:#ffffff;">${escapeHtml(code)}</span>
        </div>
        <p style="margin:0;font-size:12px;color:#94a3b8;">This code expires in <strong>15 minutes</strong>. If you did not request a reset, you can safely ignore this email.</p>
      `,
      ctaLabel: "Enter Verification Code",
      ctaUrl: `${getFrontendUrl()}/forgot-password`,
    });

    return sendEmail(email, `CineReward 8-Digit Verification Code: ${code}`, text, html);
  },
};

module.exports = emailService;
