const Chat = require('../models/Chat');
const Item = require('../models/Item');
const { notify } = require('../utils/Notificationhelper');

const PROHIBITED_PATTERNS = {
  money: /\b(money|payment|pay|price|cost|rupees|dollars|₹|\$|cash|paid|charge|fee|amount|buy|sell)\b/i,
  contact: /\b(\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|@gmail|@yahoo|@outlook|whatsapp|phone number|call me|email me)\b/i,
  personal: /\b(phone|mobile|email|whatsapp|instagram|facebook|twitter|social media|bank account|upi|paytm)\b/i,
  abuse: /\b(idiot|stupid|fool|damn|shit|fuck|bastard|asshole|bitch)\b/i,
  suspicious: /\b(fake|scam|fraud|cheat|lie|liar|illegal|drugs|weapon)\b/i
};

function checkMessageSafety(content) {
  if (PROHIBITED_PATTERNS.money.test(content))
    return { allowed: false, warning: '⚠️ This platform supports FREE donations only. Payment discussions are not allowed.' };
  if (PROHIBITED_PATTERNS.contact.test(content) || PROHIBITED_PATTERNS.personal.test(content))
    return { allowed: false, warning: '🔒 For safety reasons, personal contact details cannot be shared here.' };
  if (PROHIBITED_PATTERNS.abuse.test(content))
    return { allowed: false, warning: '⛔ Please keep the conversation respectful. Abusive language is not allowed.' };
  if (PROHIBITED_PATTERNS.suspicious.test(content))
    return { allowed: false, warning: '⚠️ This request is not allowed on this platform.' };
  return { allowed: true };
}

function generateBotResponse(userMessage, chat, senderId) {
  const msg = userMessage.toLowerCase();
  const isDonor = chat.donor._id.toString() === senderId.toString();
  if (msg.includes('pickup') || msg.includes('collect') || msg.includes('get'))
    return isDonor ? '📍 Please use the "Set Pickup Details" button to share location, date, and time.' : '✅ The donor will share pickup details soon.';
  if (msg.includes('where') || msg.includes('location') || msg.includes('address'))
    return '📍 Please share only the general pickup area, not your exact address.';
  if (msg.includes('when') || msg.includes('time') || msg.includes('date'))
    return isDonor ? '⏰ Please use the "Set Pickup Details" button.' : '⏰ Please wait for the donor to share the pickup schedule.';
  if (msg.includes('condition') || msg.includes('quality') || msg.includes('how is'))
    return '📦 Please discuss the item condition honestly.';
  if (msg.includes('confirm') || msg.includes('yes') || msg.includes('okay') || msg.includes('ok') || msg.includes('agree')) {
    if (!isDonor && !chat.pickupDetails?.confirmed)
      return '✅ Pickup confirmed! Please arrive on time. Thank you for using Donateo! 🌱';
    return '👍 Great! Looking forward to a successful donation.';
  }
  if (msg.includes('thank') || msg.includes('thanks'))
    return '😊 You\'re welcome! We\'re happy to help facilitate this donation.';
  if (chat.messages.length < 5)
    return '💬 Please coordinate the pickup location, date, and time. Contact details and payment are not allowed.';
  return null;
}

const messageRateLimit = new Map();

const createChat = async (req, res) => {
  try {
    const { itemId, receiverId } = req.body;
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (!item.isApproved) return res.status(400).json({ message: 'Chat not available - item pending admin approval' });

    let chat = await Chat.findOne({ item: itemId, donor: item.donor, receiver: receiverId });
    if (!chat) {
      chat = await Chat.create({
        item: itemId,
        donor: item.donor,
        receiver: receiverId,
        messages: [
          { sender: item.donor, content: '✅ Your request has been accepted! Please coordinate pickup details below.', isBot: false, isSystem: true },
          { sender: item.donor, content: '📋 Chat Guidelines:\n• Discuss pickup location (general area only)\n• Set date and time\n• Be respectful\n• No payment or contact details', isBot: true, isSystem: false }
        ]
      });
    }
    await chat.populate('donor receiver item');
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName status');

    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const isParticipant =
      chat.donor._id.toString() === req.user._id.toString() ||
      chat.receiver._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    // Allow viewing completed chats — frontend shows read-only state
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content, quickReply } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName status');

    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    // Block sending in closed chats
    if (chat.status === 'completed') {
      return res.status(400).json({ message: 'This chat has been closed by the donor.' });
    }

    const isParticipant =
      chat.donor._id.toString() === req.user._id.toString() ||
      chat.receiver._id.toString() === req.user._id.toString();
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const userId = req.user._id.toString();
    const now = Date.now();
    const userLimit = messageRateLimit.get(userId) || { count: 0, resetTime: now + 60000 };
    if (now < userLimit.resetTime) {
      if (userLimit.count >= 20) return res.status(429).json({ message: '⏱️ Too many messages. Please wait.' });
      userLimit.count++;
    } else {
      userLimit.count = 1;
      userLimit.resetTime = now + 60000;
    }
    messageRateLimit.set(userId, userLimit);

    if (quickReply) {
      const quickReplyMessages = {
        'ready': '✅ Item is ready for pickup!',
        'not_available': '❌ Sorry, this item is no longer available.',
        'reschedule': '🔄 Can we reschedule the pickup time?',
        'confirm_pickup': '👍 Pickup time confirmed!',
        'thank_you': '🙏 Thank you for the donation!',
        'on_my_way': '🚗 I\'m on my way to pickup location.'
      };
      chat.messages.push({ sender: req.user._id, content: quickReplyMessages[quickReply] || content, isBot: false, isQuickReply: true, readBy: [req.user._id] });
      await chat.save();
      return res.json(chat);
    }

    if (content && content.length > 500) return res.status(400).json({ message: 'Message too long. Max 500 characters.' });

    const safetyCheck = checkMessageSafety(content);
    if (!safetyCheck.allowed) {
      chat.messages.push({ sender: req.user._id, content: safetyCheck.warning, isBot: true });
      await chat.save();
      return res.json(chat);
    }

    chat.messages.push({ sender: req.user._id, content, isBot: false, readBy: [req.user._id] });
    const botResponse = generateBotResponse(content, chat, req.user._id);
    if (botResponse) chat.messages.push({ sender: req.user._id, content: botResponse, isBot: true });

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({ $or: [{ donor: req.user._id }, { receiver: req.user._id }] })
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName image _id')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find({})
      .populate('donor', 'name email phone')
      .populate('receiver', 'name email phone')
      .populate('item', 'itemName image')
      .sort({ updatedAt: -1 });
    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePickupDetails = async (req, res) => {
  try {
    const { location, date, time } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name email')
      .populate('receiver', 'name email')
      .populate('item', 'itemName');

    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    chat.pickupDetails = { location, date, time, confirmed: false };
    chat.messages.push({ sender: req.user._id, content: `📍 Pickup Details:\n• Location: ${location}\n• Date: ${date}\n• Time: ${time}\n\nReceiver, please confirm.`, isBot: false, isSystem: true });
    await chat.save();

    const formattedDate = new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    await notify({
      recipientId: chat.receiver._id,
      type: 'pickup_details_set',
      title: `Pickup details set for "${chat.item.itemName}"`,
      message: `Pickup at ${location} on ${formattedDate} at ${time}.`,
      link: '/dashboard',
      emailTemplate: 'pickup_details_set',
      emailData: [chat.receiver.name, chat.item.itemName, location, formattedDate, time]
    });

    await chat.populate('donor receiver item');
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    chat.messages.forEach(msg => {
      if (msg.readBy && !msg.readBy.includes(req.user._id)) msg.readBy.push(req.user._id);
      else if (!msg.readBy) msg.readBy = [req.user._id];
    });
    await chat.save();
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const endChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).populate('donor receiver item');
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.donor._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Only donor can end this chat' });

    chat.status = 'completed';
    chat.messages.push({
      sender: req.user._id,
      content: '✅ This chat has been closed by the donor. The donation is complete. Thank you for using Donateo! 🌱',
      isBot: true,
      isSystem: true
    });
    await chat.save();

    await notify({
      recipientId: chat.receiver._id,
      type: 'chat_ended',
      title: `Chat closed for "${chat.item.itemName}"`,
      message: `The donor has closed the chat. You can still view the chat history from your dashboard.`,
      link: '/dashboard',
      emailTemplate: 'chat_ended',
      emailData: [chat.receiver.name, chat.item.itemName]
    });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reportChat = async (req, res) => {
  try {
    const { reason } = req.body;
    const chat = await Chat.findById(req.params.id).populate('donor receiver item');
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    chat.reported = true;
    chat.reportedBy = req.user._id;
    chat.reportReason = reason || 'Inappropriate content';
    chat.reportedAt = new Date();
    await chat.save();
    await notify({
      recipientRole: 'admin',
      type: 'chat_reported',
      title: `Chat reported: "${chat.item.itemName}"`,
      message: `Reported for: ${reason}.`,
      link: '/admin',
      emailTemplate: 'chat_reported',
      emailData: ['Admin', chat.item.itemName, reason, chat.donor.name, chat.receiver.name]
    });
    res.json({ message: 'Chat reported successfully.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createChat, getChatById, sendMessage, getMyChats, getAllChats, updatePickupDetails, markAsRead, endChat, reportChat };