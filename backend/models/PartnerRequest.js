const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, enum: ['admin', 'partner'], required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const partnerRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  eventType: { type: String, required: true },
  budget: { type: Number, required: true },
  description: { type: String },
  eventDate: { type: String },
  eventLocation: { type: String },
  locationUrl: { type: String },
  status: { 
    type: String, 
    enum: ['Pending', 'Contacted', 'Negotiating', 'Accepted', 'Rejected'], 
    default: 'Pending' 
  },
  paymentCode: { type: String, unique: true, sparse: true },
  paymentAmount: { type: Number },
  paymentStatus: { type: String, enum: ['Unpaid', 'Paid'], default: 'Unpaid' },
  paidAt: { type: Date },
  adminMessage: { type: String },
  rejectReason: { type: String },
  messages: [messageSchema],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PartnerRequest', partnerRequestSchema);
