const Razorpay = require("razorpay");

const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

const razorpay = new Razorpay({
  key_id: keyId || "rzp_test_unconfigured",
  key_secret: keySecret || "unconfigured_secret",
});

razorpay.keyId = keyId;

// Connectivity Test
const testRazorpay = async () => {
  const maskedId = "... " + (process.env.RAZORPAY_KEY_ID || "").slice(-4);
  const maskedSecret =
    "... " + (process.env.RAZORPAY_KEY_SECRET || "").slice(-4);
  console.log(`[Razorpay Init] Key ID: ${maskedId}, Secret: ${maskedSecret}`);
  console.log(
    `[Razorpay Init] ID Length: ${process.env.RAZORPAY_KEY_ID?.trim().length}, Secret Length: ${process.env.RAZORPAY_KEY_SECRET?.trim().length}`,
  );
  try {
    // We don't actually create a real order here, just check if the object exists
    // and keys are provided. Authentication actually happens during API calls.
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.warn(
        "[Razorpay Init] WARNING: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing from .env",
      );
    }
  } catch (err) {
    console.error("[Razorpay Init Error]:", err.message);
  }
};
testRazorpay();

module.exports = razorpay;
