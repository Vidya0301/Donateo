const Chat = require('../models/Chat');
const Item = require('../models/Item');

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

    // Check if chat already exists
    let chat = await Chat.findOne({
      item: itemId,
      donor: item.donor,
      receiver: receiverId
    });

    if (!chat) {
      // Create new chat with bot welcome message
      chat = await Chat.create({
        item: itemId,
        donor: item.donor,
        receiver: receiverId,
        messages: [{
          sender: item.donor,
          content: 'Hello! Thank you for requesting this item. Let\'s coordinate the pickup details. Where would be a convenient location for you to pick up the item?',
          isBot: true
        }]
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
      .populate('item', 'itemName');

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
    const { content } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName');

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Check authorization
    const isParticipant = 
      chat.donor._id.toString() === req.user._id.toString() ||
      chat.receiver._id.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Add user message
    chat.messages.push({
      sender: req.user._id,
      content,
      isBot: false
    });

    // Bot response logic
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
      $or: [
        { donor: req.user._id },
        { receiver: req.user._id }
      ]
    })
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName image _id')  // Make sure _id is included
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

// Bot response generator
function generateBotResponse(userMessage, chat, senderId) {
  const msg = userMessage.toLowerCase();
  const isDonor = chat.donor._id.toString() === senderId.toString();
  
  // Check for location mentions
  if ((msg.includes('location') || msg.includes('place') || msg.includes('address')) && isDonor) {
    return 'Great! Please share the pickup address and we\'ll ask the receiver to confirm.';
  }
  
  // Check for date/time mentions
  if (msg.includes('date') || msg.includes('time') || msg.includes('when')) {
    if (isDonor) {
      return 'Perfect! What date and time works best for you?';
    } else {
      return 'Thank you! The donor will confirm the final pickup details shortly.';
    }
  }
  
  // Check for confirmation
  if (msg.includes('confirm') || msg.includes('yes') || msg.includes('okay') || msg.includes('ok')) {
    if (!isDonor && !chat.pickupDetails.confirmed) {
      return 'Wonderful! The pickup has been confirmed. Please arrive on time and bring a bag if needed. Thank you for using Donateo!';
    }
  }
  
  // Default helpful response
  if (chat.messages.length < 5) {
    return 'Please coordinate the pickup location, date, and time. Once both parties confirm, you\'ll receive a summary.';
  }
  
  return null;
}

// @desc    Update pickup details
// @route   PUT /api/chat/:id/pickup
// @access  Private
const updatePickupDetails = async (req, res) => {
  try {
    const { location, date, time } = req.body;
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    chat.pickupDetails = { location, date, time, confirmed: false };
    
    // Add bot summary message
    chat.messages.push({
      sender: req.user._id,
      content: `📍 Pickup Details:\n• Location: ${location}\n• Date: ${date}\n• Time: ${time}\n\nReceiver, please confirm these details.`,
      isBot: true
    });

    await chat.save();
    await chat.populate('donor receiver item');
    res.json(chat);
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
  updatePickupDetails
};