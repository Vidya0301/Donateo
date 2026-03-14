const https = require('https');
const { uploadImage } = require('../utils/cloudinaryUpload');
const Item = require('../models/Item');
const User = require('../models/User');
const { notify, notifyAdmins } = require('../utils/notificationHelper');

const createItem = async (req, res) => {
  try {
    const {
      itemName, category, description, image, location,
      condition, quantity,
      gender, clothingSize,
      foodQuantityUnit
    } = req.body;

    const imageUrl = await uploadImage(image);
    const item = await Item.create({
      itemName, category, description, image: imageUrl, location,
      condition, quantity,
      gender:           gender           || undefined,
      clothingSize:     clothingSize     || undefined,
      foodQuantityUnit: foodQuantityUnit || undefined,
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
    const { category, city, status, search, condition, sortBy } = req.query;

    let query = { isApproved: true };

    if (category && category !== 'all') query.category = category;
    if (city && city.trim()) query['location.city'] = new RegExp(city.trim(), 'i');
    if (status) query.status = status;
    else query.status = { $in: ['available', 'requested'] };
    if (condition && condition !== 'all') query.condition = condition;
    if (search && search.trim()) {
      query.$or = [
        { itemName:    new RegExp(search.trim(), 'i') },
        { description: new RegExp(search.trim(), 'i') }
      ];
    }

    let sort = { createdAt: -1 };
    if (sortBy === 'oldest') sort = { createdAt:  1 };
    if (sortBy === 'az')     sort = { itemName:    1 };
    if (sortBy === 'za')     sort = { itemName:   -1 };

    const items = await Item.find(query)
      .populate('donor', 'name email')
      .populate('receiver', 'name email')
      .sort(sort);

    const donorIds = [...new Set(items.map(i => i.donor?._id?.toString()).filter(Boolean))];
    const completedCounts = await Promise.all(
      donorIds.map(async (donorId) => {
        const count = await Item.countDocuments({ donor: donorId, status: 'donated' });
        return { donorId, count };
      })
    );
    const countMap = {};
    completedCounts.forEach(({ donorId, count }) => { countMap[donorId] = count; });

    const itemsWithBadge = items.map(item => {
      const obj = item.toObject();
      obj.donorCompletedCount = countMap[item.donor?._id?.toString()] || 0;
      // Flag if the current user has an active request on this item
      obj.userHasRequested = req.user
        ? obj.requests?.some(r => r.user?.toString() === req.user._id.toString())
        : false;
      return obj;
    });

    res.json(itemsWithBadge);
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

    if (item.donor._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'You cannot request your own donated item' });
    }

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

const toggleWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const itemId = req.params.id;
    const idx = user.wishlist.findIndex(id => id.toString() === itemId);
    if (idx === -1) {
      user.wishlist.push(itemId);
      await user.save();
      return res.json({ saved: true, message: 'Item saved to wishlist' });
    } else {
      user.wishlist.splice(idx, 1);
      await user.save();
      return res.json({ saved: false, message: 'Item removed from wishlist' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: { path: 'donor', select: 'name' }
    });
    const available = user.wishlist.filter(
      item => item && item.status === 'available' && item.isApproved
    );
    res.json(available);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const nominatimGeocode = (city) => new Promise((resolve) => {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`;
  const options = { headers: { 'User-Agent': 'Donateo/1.0 contact@donateo.com' } };
  https.get(url, options, (res) => {
    let data = '';
    res.on('data', chunk => { data += chunk; });
    res.on('end', () => {
      try { resolve(JSON.parse(data)); }
      catch (e) { console.error('[Geocode] JSON parse error:', e.message); resolve([]); }
    });
  }).on('error', (e) => { console.error('[Geocode] HTTPS error:', e.message); resolve([]); });
});

const geocodeItems = async (req, res) => {
  try {
    const items = await Item.find({
      $or: [{ 'location.lat': { $exists: false } }, { 'location.lat': null }],
      isApproved: true
    });
    console.log(`[Geocode] Found ${items.length} items to geocode`);
    let updated = 0;
    for (const item of items) {
      const city = item.location?.city;
      if (!city) continue;
      try {
        const data = await nominatimGeocode(city);
        if (data && data[0]) {
          item.location.lat = parseFloat(data[0].lat);
          item.location.lng = parseFloat(data[0].lon);
          await item.save();
          updated++;
        }
        await new Promise(resolve => setTimeout(resolve, 1100));
      } catch (err) {
        console.error(`[Geocode] Error for ${item.itemName}:`, err.message);
      }
    }
    res.json({ message: `Geocoded ${updated} of ${items.length} items` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const denyRequest = async (req, res) => {
  try {
    const item = await Item.findById(req.params.id).populate('donor', 'name');
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (item.donor._id.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const userId = req.params.userId;
    item.requests = item.requests.filter(r => r.user?.toString() !== userId);
    // Revert to available so others can request
    if (item.status === 'requested') {
      item.status = 'available';
    }
    await item.save();

    await notify({
      recipientId:   userId,
      type:          'request_denied',
      title:         '❌ Request Not Selected',
      message:       `Sorry, your request for "${item.itemName}" was not selected by the donor. Keep browsing for other items!`,
      link:          '/browse',
      emailTemplate: 'request_denied',
      emailData:     [item.itemName, item.donor.name]
    });

    res.json({ message: 'Request denied', item });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createItem, getItems, getItemById, updateItem, deleteItem,
  requestItem, donateItem, markAsDonated, markAsReceived,
  getMyDonations, getMyReceivedItems, toggleWishlist, getWishlist,
  geocodeItems, denyRequest
};