const Notification = require('../models/Notification');
const { sendEmail } = require('./emailService');
const User = require('../models/User');

/**
 * Create an in-app notification and send email
 * @param {Object} options
 * @param {String} options.recipientId - User ID to notify
 * @param {String} options.type - Notification type
 * @param {String} options.title - Short title
 * @param {String} options.message - Full message
 * @param {String} options.link - Frontend link
 * @param {String} options.emailTemplate - Email template name
 * @param {Array}  options.emailData - Args for email template
 */
const notify = async ({ recipientId, type, title, message, link = '/dashboard', emailTemplate, emailData = [] }) => {
  try {
    // 1. Create in-app notification
    await Notification.create({ recipient: recipientId, type, title, message, link });

    // 2. Send email if template provided
    if (emailTemplate) {
      const user = await User.findById(recipientId).select('email');
      if (user?.email) {
        await sendEmail(user.email, emailTemplate, emailData);
      }
    }
  } catch (error) {
    console.error('Notification error:', error.message);
  }
};

/**
 * Notify all admins
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