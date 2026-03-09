const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemName:    { type: String, required: true, trim: true },
  category:    { type: String, required: true, enum: ['clothes', 'books', 'bags', 'food', 'household', 'other'] },
  description: { type: String, required: true },
  image:       { type: String, required: true },
  condition:   { type: String, enum: ['new', 'like-new', 'good', 'fair'], default: 'good' },
  quantity:    { type: Number, default: 1, min: 1 },

  // ── Clothes extras ──
  gender:       { type: String, enum: ['male', 'female', 'kids'] },
  clothingSize: { type: String },

  // ── Food extras ──
  foodQuantityUnit: { type: String },

  location: {
    address: { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String },
    zipCode: { type: String }
  },

  donor:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  status:     { type: String, enum: ['pending', 'available', 'requested', 'donated'], default: 'pending' },
  isApproved: { type: Boolean, default: false },

  requests: [{
    user:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    message:   { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  donorConfirmed:      { type: Boolean, default: false },
  donorConfirmedAt:    { type: Date },
  receiverConfirmed:   { type: Boolean, default: false },
  receiverConfirmedAt: { type: Date }

}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);