const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');
const User = require('../models/User');

// Maps notification type → preference key
const PREF_MAP = {
  item_approved:    'itemApproved',
  item_rejected:    'itemApproved',    // reuse itemApproved pref
  request_received: 'requestReceived',
  request_approved: 'requestApproved',
  request_denied:   'requestApproved',
  pickup_scheduled: 'pickupScheduled',
  item_handed_over: 'itemHandedOver',
  item_received:    'itemReceived',
  pickup_reminder:  'pickupReminder',
};

/**
 * Create an in-app notification and send email
 * Respects user's notificationPreferences.
 */
const notify = async ({ recipientId, type, title, message, link = '/dashboard', emailTemplate, emailData = [] }) => {
  try {
    const user = await User.findById(recipientId).select('email notificationPreferences');
    if (!user) return;

    const prefKey = PREF_MAP[type];
    const prefs   = user.notificationPreferences;

    // Check in-app pref (default true if prefs not set)
    const sendInApp = !prefKey || !prefs || prefs[prefKey]?.inApp !== false;
    // Check email pref
    const sendMail  = !prefKey || !prefs || prefs[prefKey]?.email !== false;

    if (sendInApp) {
      await Notification.create({ recipient: recipientId, type, title, message, link });
    }

    if (emailTemplate && sendMail && user.email) {
      await sendEmail(user.email, emailTemplate, emailData);
    }
  } catch (error) {
    console.error('Notification error:', error.message);
  }
};

/**
 * Notify all admins (admins always get all notifications)
 */
const notifyAdmins = async ({ type, title, message, link = '/admin', emailTemplate, emailData = [] }) => {
  try {
    const admins = await User.find({ role: 'admin' }).select('_id email name');
    for (const admin of admins) {
      await Notification.create({ recipient: admin._id, type, title, message, link });
      if (emailTemplate) {
        const templateDataWithAdmin = [admin.name, ...emailData];
        await sendEmail(admin.email, emailTemplate, templateDataWithAdmin);
      }
    }
  } catch (error) {
    console.error('Admin notification error:', error.message);
  }
};

module.exports = { notify, notifyAdmins };