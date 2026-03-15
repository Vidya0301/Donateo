const mongoose = require('mongoose');

// Singleton settings document
const appSettingsSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true });

module.exports = mongoose.model('AppSettings', appSettingsSchema);