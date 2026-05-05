const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['cash', 'savings', 'stock', 'real_estate', 'vehicle', 'other'],
    required: true,
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  acquiredAt: {
    type: Date,
    default: Date.now,
  },
  note: {
    type: String,
    default: '',
  },
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
