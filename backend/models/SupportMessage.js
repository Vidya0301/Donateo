const mongoose = require('mongoose');

const supportMessageSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, trim: true, lowercase: true },
  subject:    { type: String, required: true, trim: true },
  message:    { type: String, required: true, trim: true },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status:     { type: String, enum: ['unread', 'read', 'resolved'], default: 'unread' },
  adminReply: { type: String, default: '' },
  repliedAt:  { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('SupportMessage', supportMessageSchema);