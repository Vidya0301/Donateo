const SupportMessage = require('../models/SupportMessage');
const { sendEmail }  = require('../utils/emailService');

// POST /api/support  — public, submit a message
const submitMessage = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const userId = req.user?._id || null;

    const msg = await SupportMessage.create({ name, email, subject, message, userId });

    // Confirmation email to sender
    try {
      await sendEmail({
        to: email,
        subject: `We received your message — Donateo Support`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
            <h2 style="color:#2e8b57">Hi ${name}, we got your message! 💚</h2>
            <p>Thanks for reaching out. Our team will get back to you within <strong>1–2 business days</strong>.</p>
            <div style="background:#fff;border-left:4px solid #2e8b57;padding:16px;border-radius:8px;margin:20px 0">
              <strong>Your message:</strong><br/>
              <em>${message}</em>
            </div>
            <p style="color:#888;font-size:0.85rem">— The Donateo Team</p>
          </div>
        `
      });
    } catch (_) { /* email failure shouldn't block submission */ }

    res.status(201).json({ message: 'Message submitted successfully', id: msg._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/support  — admin only
const getAllMessages = async (req, res) => {
  try {
    const messages = await SupportMessage.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name email');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/support/unread-count  — admin only
const getUnreadCount = async (req, res) => {
  try {
    const count = await SupportMessage.countDocuments({ status: 'unread' });
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/support/:id/read  — admin only
const markAsRead = async (req, res) => {
  try {
    const msg = await SupportMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    if (msg.status === 'unread') { msg.status = 'read'; await msg.save(); }
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/support/:id/reply  — admin only
const replyToMessage = async (req, res) => {
  try {
    const { reply } = req.body;
    if (!reply?.trim()) return res.status(400).json({ message: 'Reply cannot be empty' });

    const msg = await SupportMessage.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found' });

    msg.adminReply = reply;
    msg.repliedAt  = new Date();
    msg.status     = 'resolved';
    await msg.save();

    // Send reply email
    try {
      await sendEmail({
        to: msg.email,
        subject: `Re: ${msg.subject} — Donateo Support`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px;background:#f9f9f9;border-radius:12px">
            <h2 style="color:#2e8b57">Hi ${msg.name} 👋</h2>
            <p>Our support team has replied to your message:</p>
            <div style="background:#fff;border-left:4px solid #2e8b57;padding:16px;border-radius:8px;margin:20px 0">
              <strong>Your original message:</strong><br/>
              <em style="color:#666">${msg.message}</em>
            </div>
            <div style="background:#e8f5e9;border-left:4px solid #43a047;padding:16px;border-radius:8px;margin:20px 0">
              <strong>Our reply:</strong><br/>
              ${reply}
            </div>
            <p style="color:#888;font-size:0.85rem">— The Donateo Support Team</p>
          </div>
        `
      });
    } catch (_) {}

    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/support/:id/resolve  — admin only
const resolveMessage = async (req, res) => {
  try {
    const msg = await SupportMessage.findByIdAndUpdate(
      req.params.id,
      { status: 'resolved' },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found' });
    res.json(msg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/support/:id  — admin only
const deleteMessage = async (req, res) => {
  try {
    await SupportMessage.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  submitMessage, getAllMessages, getUnreadCount,
  markAsRead, replyToMessage, resolveMessage, deleteMessage
};