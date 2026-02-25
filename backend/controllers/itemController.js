const Item = require('../models/Item');
const User = require('../models/User');
const { notify, notifyAdmins } = require('../utils/notificationHelper');

const createItem = async (req, res) => {
  try {
    const { itemName, category, description, image, location, condition, quantity } = req.body;
    const item = await Item.create({
      itemName, category, description, image, location, condition, quantity,
      donor: req.user._id, status: 'pending', isApproved: false
    });
    await User.findByIdAndUpdate(req.user._id, { $push: { itemsDonated: item._id } });
    await notifyAdmins({
      type: 'new_item_posted',
      title: `New item needs approval: "${itemName}"`,
      message: `${req.user.name} posted "${itemName}" and it needs your approval.`,
      link: '/admin',
      emailTemplate: 'new_item_posted',
      emailData: [itemName, req.user.name]
    });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getItems = async (req, res) => {
  try {
    const { category, city, status, search } = req.query;
    let query = { isApproved: true };
    if (category && category !== 'all') query.category = category;
    if (city) query['location.city'] = new RegExp(city, 'i');
    if (status) query.status = status;
    else query.status = { $in: ['available', 'requested'] };
    if (search) query.$or = [{ itemName: new RegExp(search, 'i') }, { description: new RegExp(search, 'i') }];
    const items = await Item.find(query)
      .populate('donor', 'name email')
      .populate('receiver', 'name email')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('donor', 'name email phone address')
      .populate('receiver', 'name email phone')
      .populate('requests.user', 'name email phone');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.donor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }
    const updatedItem = await Item.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.donor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }
    await Item.findByIdAndDelete(req.params.id);
    await User.findByIdAndUpdate(item.donor, { $pull: { itemsDonated: item._id } });
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const requestItem = async (req, res) => {
  try {
    const { message } = req.body;
    const item = await Item.findById(req.params.id).populate('donor', 'name email');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.status !== 'available') return res.status(400).json({ message: 'Item is not available' });
    const alreadyRequested = item.requests.find(r => r.user.toString() === req.user._id.toString());
    if (alreadyRequested) return res.status(400).json({ message: 'You have already requested this item' });
    item.requests.push({ user: req.user._id, message });
    item.status = 'requested';
    await item.save();
    await notify({
      recipientId: item.donor._id,
      type: 'item_requested',
      title: `Someone requested "${item.itemName}"`,
      message: `${req.user.name} has requested your item "${item.itemName}".`,
      link: '/dashboard',
      emailTemplate: 'item_requested',
      emailData: [item.donor.name, item.itemName, req.user.name]
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const donateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.donor.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    if (!req.params.userId || req.params.userId === 'undefined') return res.status(400).json({ message: 'Invalid user ID' });
    item.receiver = req.params.userId;
    item.status = 'donated';
    await item.save();
    await User.findByIdAndUpdate(req.params.userId, { $push: { itemsReceived: item._id } });
    const receiver = await User.findById(req.params.userId).select('name email');
    await notify({
      recipientId: req.params.userId,
      type: 'request_approved',
      title: `Your request for "${item.itemName}" was approved!`,
      message: `${req.user.name} approved your request for "${item.itemName}". Check your chat to coordinate pickup.`,
      link: '/dashboard',
      emailTemplate: 'request_approved',
      emailData: [receiver.name, item.itemName, req.user.name]
    });
    const updatedItem = await Item.findById(item._id)
      .populate('receiver', 'name email phone')
      .populate('donor', 'name email phone');
    res.json(updatedItem);
  } catch (error) {
    console.error('Donate error:', error);
    res.status(500).json({ message: error.message });
  }
};

const markAsDonated = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('receiver', 'name email');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.donor.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    if (item.status !== 'donated') return res.status(400).json({ message: 'Item must be in donated state first' });
    item.donorConfirmed = true;
    item.donorConfirmedAt = new Date();
    await item.save();
    await notify({
      recipientId: item.receiver._id,
      type: 'item_handed_over',
      title: `"${item.itemName}" has been handed over!`,
      message: `The donor confirmed handover of "${item.itemName}". Please mark it as received.`,
      link: '/dashboard',
      emailTemplate: 'item_handed_over',
      emailData: [item.receiver.name, item.itemName]
    });
    res.json({ message: 'Marked as handed over', item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsReceived = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('donor', 'name email');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (!item.receiver || item.receiver.toString() !== req.user._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    item.receiverConfirmed = true;
    item.receiverConfirmedAt = new Date();
    await item.save();
    await notify({
      recipientId: item.donor._id,
      type: 'item_received',
      title: `"${item.itemName}" was successfully received!`,
      message: `${req.user.name} confirmed receiving "${item.itemName}". Thank you for your donation! 💚`,
      link: '/dashboard',
      emailTemplate: 'item_received',
      emailData: [item.donor.name, item.itemName, req.user.name]
    });
    const updatedItem = await Item.findById(item._id)
      .populate('donor', 'name email')
      .populate('receiver', 'name email');
    res.json({ message: 'Item marked as received', item: updatedItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyDonations = async (req, res) => {
  try {
    const items = await Item.find({ donor: req.user._id })
      .populate('receiver', 'name email')
      .populate({ path: 'requests.user', select: 'name email' })
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get items received by user
// @route   GET /api/items/my/received
// @access  Private
const getMyReceivedItems = async (req, res) => {
  try {
    const items = await Item.find({ receiver: req.user._id })
      .populate('donor', 'name email')
      .sort({ updatedAt: -1 });

    const Chat = require('../models/Chat');
    const itemsWithPickup = await Promise.all(
      items.map(async (item) => {
        const chat = await Chat.findOne({ item: item._id, receiver: req.user._id });
        const itemObj = item.toObject();
        if (chat && chat.pickupDetails && chat.pickupDetails.location) {
          itemObj.pickupScheduled = true;
          itemObj.pickupLocation = chat.pickupDetails.location;
          itemObj.pickupDate = chat.pickupDetails.date;
          itemObj.pickupTime = chat.pickupDetails.time;
          itemObj.pickupConfirmed = chat.pickupDetails.confirmed;
        } else {
          itemObj.pickupScheduled = false;
        }
        return itemObj;
      })
    );

    res.json(itemsWithPickup);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createItem, getItems, getItemById, updateItem, deleteItem,
  requestItem, donateItem, markAsDonated, markAsReceived,
  getMyDonations, getMyReceivedItems
};