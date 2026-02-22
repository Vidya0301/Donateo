const Item = require('../models/Item');
const User = require('../models/User');

// @desc    Create new item
// @route   POST /api/items
// @access  Private (Donor)
const createItem = async (req, res) => {
  try {
    const { itemName, category, description, image, location, condition, quantity } = req.body;

    const item = await Item.create({
      itemName,
      category,
      description,
      image,
      location,
      condition,
      quantity,
      donor: req.user._id,
      status: 'pending',
      isApproved: false
    });

    await User.findByIdAndUpdate(req.user._id, {
      $push: { itemsDonated: item._id }
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all items
// @route   GET /api/items
// @access  Public
const getItems = async (req, res) => {
  try {
    const { category, city, status, search } = req.query;
    
    let query = { isApproved: true };

    if (category && category !== 'all') {
      query.category = category;
    }

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    if (status) {
      query.status = status;
    } else {
      query.status = { $in: ['available', 'requested'] };
    }

    if (search) {
      query.$or = [
        { itemName: new RegExp(search, 'i') },
        { description: new RegExp(search, 'i') }
      ];
    }

    const items = await Item.find(query)
      .populate('donor', 'name email')  // Remove phone
      .populate('receiver', 'name email')  // Remove phone
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Get single item
// @route   GET /api/items/:id
// @access  Public
const getItemById = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id)
      .populate('donor', 'name email phone address')
      .populate('receiver', 'name email phone')
      .populate('requests.user', 'name email phone');

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update item
// @route   PUT /api/items/:id
// @access  Private (Donor/Admin)
const updateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is donor or admin
    if (item.donor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this item' });
    }

    const updatedItem = await Item.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete item
// @route   DELETE /api/items/:id
// @access  Private (Donor/Admin)
const deleteItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is donor or admin
    if (item.donor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this item' });
    }

    await Item.findByIdAndDelete(req.params.id);

    // Remove from donor's itemsDonated array
    await User.findByIdAndUpdate(item.donor, {
      $pull: { itemsDonated: item._id }
    });

    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Request item
// @route   POST /api/items/:id/request
// @access  Private (Receiver)
const requestItem = async (req, res) => {
  try {
    const { message } = req.body;
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (item.status !== 'available') {
      return res.status(400).json({ message: 'Item is not available' });
    }

    // Check if user already requested
    const alreadyRequested = item.requests.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (alreadyRequested) {
      return res.status(400).json({ message: 'You have already requested this item' });
    }

    item.requests.push({
      user: req.user._id,
      message
    });

    item.status = 'requested';
    await item.save();

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Approve request and donate item
// @route   PUT /api/items/:id/donate/:userId
// @access  Private (Donor)
const donateItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Check if user is the donor
    if (item.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate that userId is a valid ObjectId
    if (!req.params.userId || req.params.userId === 'undefined') {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    item.receiver = req.params.userId;
    item.status = 'donated';
    await item.save();

    // Add to receiver's itemsReceived
    await User.findByIdAndUpdate(req.params.userId, {
      $push: { itemsReceived: item._id }
    });

    // Populate and return the updated item
    const updatedItem = await Item.findById(item._id)
      .populate('receiver', 'name email phone')
      .populate('donor', 'name email phone');

    res.json(updatedItem);
  } catch (error) {
    console.error('Donate error:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my donated items
// @route   GET /api/items/my/donations
// @access  Private
const getMyDonations = async (req, res) => {
  try {
    const items = await Item.find({ donor: req.user._id })
      .populate('receiver', 'name email')  // Remove phone
      .populate({
        path: 'requests.user',
        select: 'name email'  // Remove phone
      })
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my received items
// @route   GET /api/items/my/received
// @access  Private
const getMyReceivedItems = async (req, res) => {
  try {
    const items = await Item.find({ receiver: req.user._id })
      .populate('donor', 'name email phone address')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createItem,
  getItems,
  getItemById,
  updateItem,
  deleteItem,
  requestItem,
  donateItem,
  getMyDonations,
  getMyReceivedItems
};
