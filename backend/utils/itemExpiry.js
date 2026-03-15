// backend/utils/itemExpiry.js
const AppSettings = require('../models/AppSettings');

const getExpiryDays = async () => {
  try {
    const setting = await AppSettings.findOne({ key: 'itemExpiryDays' });
    return setting ? Number(setting.value) : 0;
  } catch {
    return 0;
  }
};

const setItemExpiry = async (itemId) => {
  try {
    const days = await getExpiryDays();
    if (!days || days === 0) return; // expiry disabled

    const Item = require('../models/Item');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);
    await Item.findByIdAndUpdate(itemId, { expiresAt });
  } catch (err) {
    console.error('setItemExpiry error:', err.message);
  }
};

module.exports = { getExpiryDays, setItemExpiry };
