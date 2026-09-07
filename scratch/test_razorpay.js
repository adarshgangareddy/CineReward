const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });
const razorpay = require('../backend/config/razorpay');

async function testRazorpay() {
  console.log('Testing Razorpay with Key ID:', process.env.RAZORPAY_KEY_ID);
  try {
    const order = await razorpay.orders.create({
      amount: 100, // 1 INR
      currency: 'INR',
      receipt: 'test_receipt'
    });
    console.log('Order created successfully:', order.id);
  } catch (err) {
    console.error('Order creation failed!');
    console.error('Error Code:', err.code);
    console.error('Error Description:', err.description);
    console.error('Error Message:', err.message);
    console.error('Full Error:', JSON.stringify(err, null, 2));
  }
}

testRazorpay();
