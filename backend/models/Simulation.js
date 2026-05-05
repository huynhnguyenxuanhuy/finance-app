const mongoose = require('mongoose');

const simulationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  symbol: {
    type: String,
    required: true,
    uppercase: true,
  },
  strategy: {
    type: String,
    enum: ['dca', 'lump_sum'],
    default: 'dca',
  },
  monthlyAmount: {
    type: Number,
    default: 0,
  },
  initialAmount: {
    type: Number,
    default: 0,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  resultValue: {
    type: Number,
    default: 0,
  },
  totalInvested: {
    type: Number,
    default: 0,
  },
  profitPercent: {
    type: Number,
    default: 0,
  },
  // snapshot dữ liệu từng tháng để vẽ biểu đồ
  chartData: [{
    date: Date,
    value: Number,
    invested: Number,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Simulation', simulationSchema);
