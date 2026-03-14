const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  item:            { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  reviewer:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewee:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role:            { type: String, enum: ['receiver_rates_donor', 'donor_rates_receiver'], required: true },
  rating:          { type: Number, min: 1, max: 5, required: true },
  review:          { type: String, maxlength: 500, default: '' },
  wouldRecommend:  { type: Boolean, default: null },
  extraAnswers: {
    itemConditionMatch: { type: Number },
    communication:      { type: Number },
    punctuality:        { type: Number },
    carefulness:        { type: Number },
    generosity:         { type: Number },
    wouldDonateAgain:   { type: Number },
    wouldReceiveAgain:  { type: Number },
    wouldRecommend:     { type: Number },
    overallExperience:  { type: Number }
  },
}, { timestamps: true });

// One rating per reviewer per item per role
ratingSchema.index({ item: 1, reviewer: 1, role: 1 }, { unique: true });

module.exports = mongoose.model('Rating', ratingSchema);