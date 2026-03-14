const Rating = require('../models/Rating');
const Item   = require('../models/Item');

// POST /api/ratings — submit a rating
const submitRating = async (req, res) => {
  try {
    const { itemId, rating, review, role, wouldRecommend, extraAnswers } = req.body;
    const reviewerId = req.user._id;

    if (!itemId || !rating || !role) {
      return res.status(400).json({ message: 'itemId, rating, and role are required' });
    }

    const item = await Item.findById(itemId).populate('donor receiver');
    if (!item) return res.status(404).json({ message: 'Item not found' });

    // Must be fully completed
    if (!item.donorConfirmed || !item.receiverConfirmed) {
      return res.status(400).json({ message: 'Item must be fully completed before rating' });
    }

    // Determine reviewee
    let revieweeId;
    if (role === 'receiver_rates_donor') {
      if (item.receiver._id.toString() !== reviewerId.toString()) {
        return res.status(403).json({ message: 'Only the receiver can submit this rating' });
      }
      revieweeId = item.donor._id;
    } else if (role === 'donor_rates_receiver') {
      if (item.donor._id.toString() !== reviewerId.toString()) {
        return res.status(403).json({ message: 'Only the donor can submit this rating' });
      }
      revieweeId = item.receiver._id;
    } else {
      return res.status(400).json({ message: 'Invalid role' });
    }

    const existing = await Rating.findOne({ item: itemId, reviewer: reviewerId, role });
    if (existing) return res.status(400).json({ message: 'You have already rated this donation' });

    const newRating = await Rating.create({
      item: itemId,
      reviewer: reviewerId,
      reviewee: revieweeId,
      role,
      rating,
      review: review || '',
      wouldRecommend: wouldRecommend ?? null,
      extraAnswers:   extraAnswers   || {}
    });

    res.status(201).json({ message: 'Rating submitted', rating: newRating });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You have already rated this donation' });
    }
    res.status(500).json({ message: error.message });
  }
};

// GET /api/ratings/user/:userId — get all ratings for a user (their profile)
const getUserRatings = async (req, res) => {
  try {
    const { userId } = req.params;
    const ratings = await Rating.find({ reviewee: userId })
      .populate('reviewer', 'name')
      .populate('item', 'itemName')
      .sort({ createdAt: -1 });

    const total = ratings.length;
    const avg   = total > 0 ? (ratings.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : null;

    res.json({ ratings, average: avg, total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/ratings/check/:itemId — check if current user already rated an item
const checkRating = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user._id;

    const asReceiver = await Rating.findOne({ item: itemId, reviewer: userId, role: 'receiver_rates_donor' });
    const asDonor    = await Rating.findOne({ item: itemId, reviewer: userId, role: 'donor_rates_receiver' });

    res.json({
      ratedAsReceiver: !!asReceiver,
      ratedAsDonor:    !!asDonor
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/ratings/admin/all — admin view all ratings
const getAllRatings = async (req, res) => {
  try {
    const ratings = await Rating.find()
      .populate('reviewer', 'name email')
      .populate('reviewee', 'name email')
      .populate('item', 'itemName')
      .sort({ createdAt: -1 });
    res.json(ratings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/ratings/:id — admin delete a rating
const deleteRating = async (req, res) => {
  try {
    await Rating.findByIdAndDelete(req.params.id);
    res.json({ message: 'Rating deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitRating, getUserRatings, checkRating, getAllRatings, deleteRating };