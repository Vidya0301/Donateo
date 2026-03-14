const mongoose = require('mongoose');

const appReviewSchema = new mongoose.Schema({
  user:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  rating: { type: Number, min: 1, max: 5, required: true },
  review: { type: String, maxlength: 500, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('AppReview', appReviewSchema);