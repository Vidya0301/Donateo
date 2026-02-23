const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'new_item_posted',
      'item_approved',
      'item_requested',
      'request_approved',
      'pickup_details_set',
      'item_handed_over',
      'item_received',
      'new_user_registered',
      'welcome'
    ],
    required: true
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '/dashboard' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);