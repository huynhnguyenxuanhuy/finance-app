const mongoose = require('mongoose');

const portfolioStockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
  },
  shares: {
    type: Number,
    required: true,
    min: 0,
  },
  buyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  investedAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  buyDate: {
    type: Date,
    required: true,
  },
  strategy: {
    type: String,
    enum: ['lump_sum', 'dca', 'other'],
    default: 'lump_sum',
  },
  note: {
    type: String,
    default: '',
  },
});

const portfolioSchema = new mongoose.Schema({
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
  description: {
    type: String,
    default: '',
  },
  stocks: [portfolioStockSchema],
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
