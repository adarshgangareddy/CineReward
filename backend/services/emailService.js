const { sendEmail } = require("../config/notifications");

const emailService = {
  sendTicketConfirmation: async (userEmail, bookingDetails) => {
    const { movieTitle, theatre, seat, date, time, price, ticketId } =
      bookingDetails;
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    const body =
      `Your CineReward ticket is confirmed.\n\n` +
      `MOVIE: ${movieTitle}\n` +
      `THEATRE: ${theatre}\n` +
      `DATE: ${date}\n` +
      `TIME: ${time}\n` +
      `SEAT(S): ${seat}\n` +
      `TOTAL PAID: INR ${price}\n` +
      `TICKET ID: ${ticketId}\n\n` +
      `View your booked ticket: ${frontendUrl}/dashboard\n\n` +
      `Please show this ticket ID at the theatre. Enjoy your movie!`;
    return sendEmail(userEmail, "CineReward Ticket Confirmation", body);
  },

  sendReviewReminder: async (userEmail, movieTitle, quickReviewUrl) => {
    const body = `We hope you enjoyed ${movieTitle}!\n\nYour opinion matters to us. Review the movie now and earn a chance to win 100 reward coins!\n\nSubmit Your Review Directly Here: ${quickReviewUrl}\n\nThank you for choosing CineReward.`;
    return sendEmail(userEmail, `Rate your experience: ${movieTitle} 🎥`, body);
  },

  sendWinnerNotification: async (userEmail, movieTitle, coins) => {
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    const body = `Congratulations! You have been rewarded with ${coins} Reward Coins for your review of ${movieTitle}.\n\nView Your Dashboard here: ${frontendUrl}/dashboard`;
    return sendEmail(userEmail, "Congratulations! You are a Winner! 🏆", body);
  },

  sendPartnerAccepted: async (
    email,
    name,
    paymentCode,
    amount,
    bankDetails,
  ) => {
    const body = `Hi ${name},\n\nYour partnership request has been ACCEPTED!\n\nReference Code: ${paymentCode}\nAmount: ₹${amount}\nBank: ${bankDetails.bankName}\nAccount: ${bankDetails.accountNo}\nIFSC: ${bankDetails.ifsc}\nUPI: ${bankDetails.upi}\n\nPlease include code ${paymentCode} in payment remarks.`;
    return sendEmail(email, "CineReward Partnership Accepted! 🎉", body);
  },

  sendPartnerNegotiate: async (email, name, adminMessage) => {
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    const body = `Hi ${name},\n\nOur team has a message regarding your partnership inquiry:\n\n"${adminMessage}"\n\nView details here: ${frontendUrl}/partner`;
    return sendEmail(email, "Message from CineReward Team", body);
  },

  sendPartnerRejected: async (email, name, reason) => {
    const frontendUrl = (
      process.env.FRONTEND_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    const body = `Hi ${name},\n\nUpdate on your partnership inquiry.\n\nReason: ${reason}\n\nYou can submit a new request here: ${frontendUrl}/partner`;
    return sendEmail(email, "Partnership Update — CineReward", body);
  },

  sendPasswordResetEmail: async (userEmail, resetUrl) => {
    const body = `You requested a password reset. Please click on the link below to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.\n\nThis link will expire in 1 hour.`;
    return sendEmail(userEmail, "CineReward Password Reset", body);
  },
};

module.exports = emailService;
