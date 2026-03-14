const AppReview = require('../models/AppReview');

// POST /api/app-reviews — submit or update own review
const submitReview = async (req, res) => {
  try {
    const { rating, review } = req.body;
    if (!rating) return res.status(400).json({ message: 'Rating is required' });

    const existing = await AppReview.findOne({ user: req.user._id });
    if (existing) {
      existing.rating = rating;
      existing.review = review || '';
      await existing.save();
      return res.json({ message: 'Review updated', review: existing, isUpdate: true });
    }

    const newReview = await AppReview.create({ user: req.user._id, rating, review: review || '' });
    res.status(201).json({ message: 'Review submitted', review: newReview, isUpdate: false });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/app-reviews/mine — get current user's review
const getMyReview = async (req, res) => {
  try {
    const review = await AppReview.findOne({ user: req.user._id });
    res.json(review || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/app-reviews/admin/all — admin: all reviews
const getAllReviews = async (req, res) => {
  try {
    const reviews = await AppReview.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 });

    const total   = reviews.length;
    const average = total > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1)
      : null;

    // Distribution count per star
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(r => { distribution[r.rating] = (distribution[r.rating] || 0) + 1; });

    res.json({ reviews, total, average, distribution });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/app-reviews/:id — admin delete
const deleteReview = async (req, res) => {
  try {
    await AppReview.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { submitReview, getMyReview, getAllReviews, deleteReview };