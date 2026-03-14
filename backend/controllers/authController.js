const jwt = require('jsonwebtoken');
const User   = require('../models/User');
const Item   = require('../models/Item');
const Rating = require('../models/Rating');
const OTP = require('../models/OTP');
const { sendEmail } = require('../utils/emailService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ─────────────────────────────────────────
// STEP 1: Register → Create user (unverified) + Send OTP
// ─────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, address } = req.body;

    // Check if verified user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    // Delete old unverified user if re-registering
    if (existingUser && !existingUser.isVerified) {
      await User.deleteOne({ email });
    }

    // Create new user — explicitly set isVerified: false for new registrations
    const user = await User.create({
      name, email, password,
      role: role || 'donor',
      phone, address,
      isVerified: false   // ← new users must verify email
    });

    // Generate 6-digit OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Remove any old OTPs for this email
    await OTP.deleteMany({ email });
    await OTP.create({ email, otp, expiresAt, attempts: 0 });

    // Send OTP email using correct sendEmail(to, templateName, templateData) signature
    await sendEmail(email, 'otp_verification', [name, otp]);

    res.status(200).json({
      message: 'OTP sent to your email. Please verify to complete registration.',
      email,
      requiresVerification: true
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────
// STEP 2: Verify OTP → Activate account
// ─────────────────────────────────────────
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const otpRecord = await OTP.findOne({ email });

    if (!otpRecord) {
      return res.status(400).json({ message: 'OTP not found. Please register again.' });
    }

    // Check expiry
    if (otpRecord.expiresAt < new Date()) {
      await OTP.deleteOne({ email });
      await User.deleteOne({ email, isVerified: false });
      return res.status(400).json({ message: 'OTP has expired. Please register again.' });
    }

    // Wrong OTP
    if (otpRecord.otp !== otp) {
      otpRecord.attempts = (otpRecord.attempts || 0) + 1;
      await otpRecord.save();

      if (otpRecord.attempts >= 3) {
        await OTP.deleteOne({ email });
        await User.deleteOne({ email, isVerified: false });
        return res.status(400).json({ message: 'Too many wrong attempts. Please register again.' });
      }

      return res.status(400).json({
        message: `Incorrect OTP. ${3 - otpRecord.attempts} attempt(s) remaining.`
      });
    }

    // ✅ OTP correct — activate user
    const user = await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found. Please register again.' });
    }

    // Clean up OTP
    await OTP.deleteOne({ email });

    // Send welcome email using existing template
    try {
      await sendEmail(user.email, 'welcome', [user.name]);
    } catch (emailErr) {
      console.log('Welcome email failed (non-critical):', emailErr.message);
    }

    // Return token so user is auto-logged in
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      isVerified: true,
      token: generateToken(user._id)
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────
// Resend OTP
// ─────────────────────────────────────────
const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email, isVerified: false });
    if (!user) {
      return res.status(400).json({ message: 'No pending verification for this email.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.deleteMany({ email });
    await OTP.create({ email, otp, expiresAt, attempts: 0 });

    await sendEmail(email, 'otp_verification', [user.name, otp]);

    res.status(200).json({ message: 'New OTP sent to your email.' });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ─────────────────────────────────────────
// Login — blocks unverified users
// ─────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+password');

    if (!user) return res.status(401).json({ message: 'Invalid email or password' });
    if (!user.isActive) return res.status(401).json({ message: 'Account has been deactivated' });

    // Block unverified new users
    if (!user.isVerified) {
      return res.status(401).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid email or password' });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      address: user.address,
      isVerified: user.isVerified,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('itemsDonated')
      .populate('itemsReceived');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.name = req.body.name || user.name;
      user.phone = req.body.phone || user.phone;
      user.address = req.body.address || user.address;
      if (req.body.password) user.password = req.body.password;
      const updatedUser = await user.save();
      res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        address: updatedUser.address,
        token: generateToken(updatedUser._id)
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/auth/notification-preferences
const getNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('notificationPreferences');
    const defaults = {
      itemApproved:    { inApp: true, email: true },
      requestReceived: { inApp: true, email: true },
      requestApproved: { inApp: true, email: true },
      pickupScheduled: { inApp: true, email: true },
      itemHandedOver:  { inApp: true, email: true },
      itemReceived:    { inApp: true, email: true },
      pickupReminder:  { inApp: true, email: true }
    };
    // Merge saved prefs with defaults
    const prefs = {};
    for (const key of Object.keys(defaults)) {
      prefs[key] = {
        inApp: user.notificationPreferences?.[key]?.inApp ?? true,
        email: user.notificationPreferences?.[key]?.email ?? true
      };
    }
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/notification-preferences
const updateNotificationPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.notificationPreferences = req.body;
    await user.save();
    res.json({ message: 'Preferences saved', preferences: user.notificationPreferences });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// GET /api/auth/user/:userId/public — public donor profile (no auth required)
const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;

    // Basic user info (no sensitive fields)
    const user = await User.findById(userId).select('name role createdAt address');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // All donated items (status = donated, approved)
    const donatedItems = await Item.find({ donor: userId, status: 'donated', isApproved: true })
      .select('itemName description category image condition location donorConfirmedAt updatedAt')
      .sort({ updatedAt: -1 });

    // Active items (available/requested)
    const activeItems = await Item.find({ donor: userId, status: { $in: ['available', 'requested'] }, isApproved: true })
      .select('itemName description category image condition location createdAt status')
      .sort({ createdAt: -1 });

    // Donation count for badge
    const completedCount = donatedItems.length;

    // Ratings received as a donor
    const ratings = await Rating.find({ reviewee: userId })
      .populate('reviewer', 'name')
      .populate('item', 'itemName')
      .sort({ createdAt: -1 })
      .limit(10);

    const avgRating = ratings.length > 0
      ? (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
      : null;

    // Member since
    res.json({
      user: { name: user.name, role: user.role, city: user.address?.city, memberSince: user.createdAt },
      completedCount,
      activeItems,
      donatedItems,
      ratings: { average: avgRating, total: ratings.length, list: ratings }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, verifyOTP, resendOTP, login, getMe, updateProfile, getNotificationPreferences,
  updateNotificationPreferences, getPublicProfile
};