const Razorpay = require('razorpay');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../backend/.env') });

const instance = new Razorpay({
  key_id: (process.env.RAZORPAY_KEY_ID || '').trim(),
  key_secret: (process.env.RAZORPAY_KEY_SECRET || '').trim(),
});

console.log('Testing Razorpay with Key ID:', process.env.RAZORPAY_KEY_ID);

instance.orders.create({
  amount: 50000,
  currency: 'INR',
  receipt: 'receipt#1'
}).then(order => {
  console.log('SUCCESS: Order created:', order.id);
}).catch(error => {
  console.error('FAILURE: Razorpay Error:');
  console.error('Status Code:', error.statusCode);
  console.error('Description:', error.description);
  console.error('Metadata:', error.metadata);
  console.error('Raw Error:', error);
});
