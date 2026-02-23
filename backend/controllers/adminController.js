const Item = require('../models/Item');
const User = require('../models/User');
const { notify, notifyAdmins } = require('../utils/Notificationhelper');

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { isActive, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (isActive !== undefined) user.isActive = isActive;
    if (role) user.role = role;
    await user.save();
    res.json({ _id: user._id, name: user.name, email: user.email, role: user.role, isActive: user.isActive });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ message: 'Cannot delete admin user' });
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getAllItems = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) {
      if (status === 'pending') query.isApproved = false;
      else query.status = status;
    }
    const items = await Item.find(query)
      .populate('donor', 'name email phone')
      .populate('receiver', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const approveItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('donor', 'name email');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    item.isApproved = true;
    item.status = 'available';
    await item.save();

    // Notify donor that their item was approved
    await notify({
      recipientId: item.donor._id,
      type: 'item_approved',
      title: `Your item "${item.itemName}" was approved!`,
      message: `Your item "${item.itemName}" has been approved and is now live on Donateo.`,
      link: '/dashboard',
      emailTemplate: 'item_approved',
      emailData: [item.donor.name, item.itemName]
    });

    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const removeItem = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await User.findByIdAndUpdate(item.donor, { $pull: { itemsDonated: item._id } });
    await Item.findByIdAndDelete(req.params.id);
    res.json({ message: 'Item removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const totalReceivers = await User.countDocuments({ role: 'receiver' });
    const totalItems = await Item.countDocuments();
    const pendingItems = await Item.countDocuments({ isApproved: false });
    const availableItems = await Item.countDocuments({ status: 'available' });
    const requestedItems = await Item.countDocuments({ status: 'requested' });
    const donatedItems = await Item.countDocuments({ status: 'donated' });
    const itemsByCategory = await Item.aggregate([
      { $match: { isApproved: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);
    res.json({
      users: { total: totalUsers, donors: totalDonors, receivers: totalReceivers },
      items: { total: totalItems, pending: pendingItems, available: availableItems, requested: requestedItems, donated: donatedItems },
      itemsByCategory
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPublicStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ isActive: true });
    const donatedItems = await Item.countDocuments({ status: 'donated' });
    const totalItems = await Item.countDocuments({ isApproved: true });
    res.json({ totalUsers, donatedItems, totalItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getAllUsers, updateUserStatus, deleteUser, getAllItems, approveItem, removeItem, getDashboardStats, getPublicStats };