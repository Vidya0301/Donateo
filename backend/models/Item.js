const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  itemName: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['clothes', 'books', 'bags', 'food', 'household', 'other']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: 1000
  },
  image: {
    type: String,
    required: [true, 'Image is required']
  },
  location: {
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: String,
    zipCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  donor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'available', 'requested', 'donated'],
    default: 'pending'
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  requests: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    requestedAt: {
      type: Date,
      default: Date.now
    }
  }],
  isApproved: {
    type: Boolean,
    default: false
  },
  condition: {
    type: String,
    enum: ['new', 'like-new', 'good', 'fair'],
    default: 'good'
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },

  // ── Handover confirmation ──
  donorConfirmed: {
    type: Boolean,
    default: false
  },
  donorConfirmedAt: {
    type: Date,
    default: null
  },

  // ── Receipt confirmation ──
  receiverConfirmed: {
    type: Boolean,
    default: false
  },
  receiverConfirmedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for searching
itemSchema.index({ itemName: 'text', description: 'text' });
itemSchema.index({ category: 1, status: 1 });
itemSchema.index({ 'location.city': 1 });

module.exports = mongoose.model('Item', itemSchema);