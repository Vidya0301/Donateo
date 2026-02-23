const Chat = require('../models/Chat');
const Item = require('../models/Item');
const { notify } = require('../utils/Notificationhelper');

const createChat = async (req, res) => {
  try {
    const { itemId, receiverId } = req.body;
    const item = await Item.findById(itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });

    let chat = await Chat.findOne({ item: itemId, donor: item.donor, receiver: receiverId });
    if (!chat) {
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

const getChatById = async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName');
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const isParticipant =
      chat.donor._id.toString() === req.user._id.toString() ||
      chat.receiver._id.toString() === req.user._id.toString() ||
      req.user.role === 'admin';
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName');
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    const isParticipant =
      chat.donor._id.toString() === req.user._id.toString() ||
      chat.receiver._id.toString() === req.user._id.toString();
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    chat.messages.push({ sender: req.user._id, content, isBot: false });

    const botResponse = generateBotResponse(content, chat, req.user._id);
    if (botResponse) {
      chat.messages.push({ sender: req.user._id, content: botResponse, isBot: true });
    }

    await chat.save();
    res.json(chat);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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

function generateBotResponse(userMessage, chat, senderId) {
  const msg = userMessage.toLowerCase();
  const isDonor = chat.donor._id.toString() === senderId.toString();

  if ((msg.includes('location') || msg.includes('place') || msg.includes('address')) && isDonor) {
    return 'Great! Please share the pickup address and we\'ll ask the receiver to confirm.';
  }
  if (msg.includes('date') || msg.includes('time') || msg.includes('when')) {
    if (isDonor) return 'Perfect! What date and time works best for you?';
    else return 'Thank you! The donor will confirm the final pickup details shortly.';
  }
  if (msg.includes('confirm') || msg.includes('yes') || msg.includes('okay') || msg.includes('ok')) {
    if (!isDonor && !chat.pickupDetails?.confirmed) {
      return 'Wonderful! The pickup has been confirmed. Please arrive on time and bring a bag if needed. Thank you for using Donateo!';
    }
  }
  if (chat.messages.length < 5) {
    return 'Please coordinate the pickup location, date, and time. Once both parties confirm, you\'ll receive a summary.';
  }
  return null;
}

const updatePickupDetails = async (req, res) => {
  try {
    const { location, date, time } = req.body;
    const chat = await Chat.findById(req.params.id)
      .populate('donor', 'name')
      .populate('receiver', 'name')
      .populate('item', 'itemName');
    if (!chat) return res.status(404).json({ message: 'Chat not found' });

    chat.pickupDetails = { location, date, time, confirmed: false };
    chat.messages.push({
      sender: req.user._id,
      content: `📍 Pickup Details:\n• Location: ${location}\n• Date: ${date}\n• Time: ${time}\n\nReceiver, please confirm these details.`,
      isBot: true
    });

    await chat.save();

    // Notify receiver about pickup details
    const formattedDate = new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

module.exports = { createChat, getChatById, sendMessage, getMyChats, getAllChats, updatePickupDetails };