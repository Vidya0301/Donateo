const Chat = require('../models/Chat');
const Item = require('../models/Item');
const { notify } = require('../utils/Notificationhelper');

// Prohibited patterns for safety
const PROHIBITED_PATTERNS = {
  money: /\b(money|payment|pay|price|cost|rupees|dollars|₹|\$|cash|paid|charge|fee|amount|buy|sell)\b/i,
  contact: /\b(\d{10}|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|@gmail|@yahoo|@outlook|whatsapp|phone number|call me|email me)\b/i,
  personal: /\b(phone|mobile|email|whatsapp|instagram|facebook|twitter|social media|bank account|upi|paytm)\b/i,
  abuse: /\b(idiot|stupid|fool|damn|shit|fuck|bastard|asshole|bitch)\b/i,
  suspicious: /\b(fake|scam|fraud|cheat|lie|liar|illegal|drugs|weapon)\b/i
};

// Check if message violates rules
function checkMessageSafety(content) {
  if (PROHIBITED_PATTERNS.money.test(content)) {
    return {
      allowed: false,
      warning: '⚠️ This platform supports FREE donations only. Payment discussions are not allowed.'
    };
  }
  
  if (PROHIBITED_PATTERNS.contact.test(content) || PROHIBITED_PATTERNS.personal.test(content)) {
    return {
      allowed: false,
      warning: '🔒 For safety reasons, personal contact details (phone, email, social media) cannot be shared here. Please coordinate through the platform.'
    };
  }
  
  if (PROHIBITED_PATTERNS.abuse.test(content)) {
    return {
      allowed: false,
      warning: '⛔ Please keep the conversation respectful. Abusive language is not allowed. Continued misuse will result in reporting to admin.'
    };
  }
  
  if (PROHIBITED_PATTERNS.suspicious.test(content)) {
    return {
      allowed: false,
      warning: '⚠️ This request is not allowed on this platform. Please report suspicious activity to admin.'
    };
  }
  
  return { allowed: true };
}

// Enhanced bot response generator
function generateBotResponse(userMessage, chat, senderId) {
  const msg = userMessage.toLowerCase();
  const isDonor = chat.donor._id.toString() === senderId.toString();
  
  // Pickup-related responses
  if (msg.includes('pickup') || msg.includes('collect') || msg.includes('get')) {
    if (isDonor) {
      return '📍 Great! Please use the "Set Pickup Details" button to share the location, date, and time. Share only the general area, not your exact address.';
    } else {
      return '✅ The donor will share pickup details soon. You can coordinate the time that works for both of you.';
    }
  }
  
  // Location-related
  if (msg.includes('where') || msg.includes('location') || msg.includes('address')) {
    return '📍 Please share only the general pickup area (like neighborhood name), not your exact address. Use the "Set Pickup Details" button.';
  }
  
  // Time-related
  if (msg.includes('when') || msg.includes('time') || msg.includes('date')) {
    if (isDonor) {
      return '⏰ Please use the "Set Pickup Details" button to suggest a date and time that works for you.';
    } else {
      return '⏰ Please wait for the donor to share the pickup schedule, or suggest a time that works for you.';
    }
  }
  
  // Condition questions
  if (msg.includes('condition') || msg.includes('quality') || msg.includes('how is')) {
    return '📦 Please discuss the item condition. Donors, be honest about the item state. Receivers, feel free to ask questions.';
  }
  
  // Confirmation responses
  if (msg.includes('confirm') || msg.includes('yes') || msg.includes('okay') || msg.includes('ok') || msg.includes('agree')) {
    if (!isDonor && !chat.pickupDetails?.confirmed) {
      return '✅ Wonderful! The pickup has been confirmed. Please arrive on time and be respectful of each other\'s time. Thank you for using Donateo! 🌱';
    }
    return '👍 Great! Looking forward to a successful donation.';
  }
  
  // Thank you responses
  if (msg.includes('thank') || msg.includes('thanks')) {
    return '😊 You\'re welcome! We\'re happy to help facilitate this donation. Please be respectful and kind to each other.';
  }
  
  // Default helpful message
  if (chat.messages.length < 5) {
    return '💬 Please coordinate the pickup location (general area only), date, and time. Keep the conversation respectful and focused on the donation. Contact details and payment are not allowed.';
  }
  
  return null;
}

// Rate limiting state (in-memory - use Redis in production)
const messageRateLimit = new Map();

// @desc    Create chat when request is approved
// @route   POST /api/chat
// @access  Private
const createChat = async (req, res) => {
  try {
    const { itemId, receiverId } = req.body;
    const item = await Item.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if item is approved
    if (!item.isApproved) {
      return res.status(400).json({ message: 'Chat not available - item pending admin approval' });
    }

    // Check if item is already donated
    if (item.status === 'donated') {
      return res.status(400).json({ message: 'Chat not available - item already donated to someone else' });
    }

    // Check if chat already exists
    let chat = await Chat.findOne({
      item: itemId,
      donor: item.donor,
      receiver: receiverId
    });

    if (!chat) {
      // Create new chat with system welcome messages
      chat = await Chat.create({
        item: itemId,
        donor: item.donor,
        receiver: receiverId,
        messages: [
          {
            sender: item.donor,
            content: '✅ Your request has been accepted! Please coordinate pickup details below.',
            isBot: false,
            isSystem: true
          },
          {
            sender: item.donor,
            content: '📋 Chat Guidelines:\n• Discuss pickup location (general area only)\n• Set date and time\n• Be respectful and polite\n• No payment or contact details\n\nUse the buttons below for quick actions.',
            isBot: true,
            isSystem: false
          }
        ]
      });
    }

    await chat.populate('donor receiver item');
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get chat by ID
// @route   GET /api/chat/:id
// @access  Private
const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName status');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check authorization
    const isParticipant =
      chat.donor._id.toString() === req.user._id.toString() ||
      chat.receiver._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send message in chat
// @route   POST /api/chat/:id/message
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { content, quickReply } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName status');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check if chat is completed
    if (chat.status === 'completed') {
      return res.status(400).json({ message: 'This chat has ended - item already donated' });
    }

    // Check authorization
    const isParticipant =
      chat.donor._id.toString() === req.user._id.toString() ||
      chat.receiver._id.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Rate limiting: max 20 messages per minute per user
    const userId = req.user._id.toString();
    const now = Date.now();
    const userLimit = messageRateLimit.get(userId) || { count: 0, resetTime: now + 60000 };
    
    if (now < userLimit.resetTime) {
      if (userLimit.count >= 20) {
        return res.status(429).json({ message: '⏱️ Too many messages. Please wait a moment.' });
      }
      userLimit.count++;
    } else {
      userLimit.count = 1;
      userLimit.resetTime = now + 60000;
    }
    messageRateLimit.set(userId, userLimit);

    // Handle quick replies
    if (quickReply) {
      const quickReplyMessages = {
        'ready': '✅ Item is ready for pickup!',
        'not_available': '❌ Sorry, this item is no longer available.',
        'reschedule': '🔄 Can we reschedule the pickup time?',
        'confirm_pickup': '👍 Pickup time confirmed!',
        'thank_you': '🙏 Thank you for the donation!',
        'on_my_way': '🚗 I\'m on my way to pickup location.'
      };
      
      const message = quickReplyMessages[quickReply] || content;
      chat.messages.push({
        sender: req.user._id,
        content: message,
        isBot: false,
        isQuickReply: true,
        readBy: [req.user._id]
      });
      await chat.save();
      return res.json(chat);
    }

    // Message length limit
    if (content && content.length > 500) {
      return res.status(400).json({ message: 'Message too long. Maximum 500 characters.' });
    }

    // Check message safety
    const safetyCheck = checkMessageSafety(content);
    
    if (!safetyCheck.allowed) {
      // Add warning message from bot instead of user message
      chat.messages.push({
        sender: req.user._id,
        content: safetyCheck.warning,
        isBot: true
      });
      await chat.save();
      return res.json(chat);
    }

    // Add user message (message passed safety check)
    chat.messages.push({
      sender: req.user._id,
      content,
      isBot: false,
      readBy: [req.user._id]
    });

    // Generate bot response
    const botResponse = generateBotResponse(content, chat, req.user._id);
    if (botResponse) {
      chat.messages.push({
        sender: req.user._id,
        content: botResponse,
        isBot: true
      });
    }

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my chats
// @route   GET /api/chat/my
// @access  Private
const getMyChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      $or: [{ donor: req.user._id }, { receiver: req.user._id }]
    })
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName image _id')
      .sort({ updatedAt: -1 });

    res.json(chats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all chats (Admin)
// @route   GET /api/chat/admin/all
// @access  Private (Admin)
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

// @desc    Update pickup details
// @route   PUT /api/chat/:id/pickup
// @access  Private
const updatePickupDetails = async (req, res) => {
  try {
    const { location, date, time } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name email')
      .populate('receiver', 'name email')
      .populate('item', 'itemName');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.pickupDetails = { location, date, time, confirmed: false };
    chat.messages.push({
      sender: req.user._id,
      content: `📍 Pickup Details:\n• Location: ${location}\n• Date: ${date}\n• Time: ${time}\n\nReceiver, please confirm these details.`,
      isBot: false,
      isSystem: true
    });

    await chat.save();

    // Notify receiver about pickup details
    const formattedDate = new Date(date).toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    await notify({
      recipientId: chat.receiver._id,
      type: 'pickup_details_set',
      title: `Pickup details set for "${chat.item.itemName}"`,
      message: `Pickup at ${location} on ${formattedDate} at ${time}. Please confirm in the chat.`,
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

// @desc    Mark messages as read
// @route   PUT /api/chat/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Mark all messages as read by this user
    chat.messages.forEach(msg => {
      if (msg.readBy && !msg.readBy.includes(req.user._id)) {
        msg.readBy.push(req.user._id);
      } else if (!msg.readBy) {
        msg.readBy = [req.user._id];
      }
    });

    await chat.save();
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    End chat (mark as completed)
// @route   PUT /api/chat/:id/end
// @access  Private
const endChat = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('donor receiver item');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Only donor can end chat
    if (chat.donor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only donor can end this chat' });
    }

    chat.status = 'completed';
    chat.messages.push({
      sender: req.user._id,
      content: '✅ This chat has been closed. The donation is complete. Thank you for using Donateo! 🌱',
      isBot: true,
      isSystem: true
    });

    await chat.save();

    // Notify receiver that chat ended
    await notify({
      recipientId: chat.receiver._id,
      type: 'chat_ended',
      title: `Chat closed for "${chat.item.itemName}"`,
      message: `The donor has marked this donation as complete. Thank you for using Donateo!`,
      link: '/dashboard',
      emailTemplate: 'chat_ended',
      emailData: [chat.receiver.name, chat.item.itemName]
    });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Report chat (flag for admin)
// @route   PUT /api/chat/:id/report
// @access  Private
const reportChat = async (req, res) => {
  try {
    const { reason } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor receiver item');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.reported = true;
    chat.reportedBy = req.user._id;
    chat.reportReason = reason || 'Inappropriate content';
    chat.reportedAt = new Date();

    await chat.save();

    // Notify all admins about the report
    await notify({
      recipientRole: 'admin',
      type: 'chat_reported',
      title: `Chat reported: "${chat.item.itemName}"`,
      message: `A chat has been reported for: ${reason}. Please review immediately.`,
      link: '/admin',
      emailTemplate: 'chat_reported',
      emailData: ['Admin', chat.item.itemName, reason, chat.donor.name, chat.receiver.name]
    });

    res.json({ message: 'Chat reported successfully. Admin will review.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createChat,
  getChatById,
  sendMessage,
  getMyChats,
  getAllChats,
  updatePickupDetails,
  markAsRead,
  endChat,
  reportChat
};