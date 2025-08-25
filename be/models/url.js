const mongoose = require('mongoose');

const UrlSchema = new mongoose.Schema({
  originalUrl: {
    type: String,
    required: true,
    trim: true,
  },
  shortCode: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  clicks: {
    type: Number,
    required: true,
    default: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  lastAccessed: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: String,
    default: 'anonymous',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Url', UrlSchema);