const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['donor', 'receiver', 'admin'],
    default: 'donor'
  },
  phone:   { type: String, trim: true },
  address: { street: String, city: String, state: String, zipCode: String },
  isActive:   { type: Boolean, default: true },
  isVerified: { type: Boolean, default: true },

  itemsDonated:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  itemsReceived: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  wishlist:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'Item' }],
  notificationPreferences: {
    itemApproved:     { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    requestReceived:  { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    requestApproved:  { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    pickupScheduled:  { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    itemHandedOver:   { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    itemReceived:     { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } },
    pickupReminder:   { inApp: { type: Boolean, default: true }, email: { type: Boolean, default: true } }
  },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) { next(error); }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);