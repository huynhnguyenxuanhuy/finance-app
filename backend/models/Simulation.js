const mongoose = require('mongoose');

const simulationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  portfolioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Portfolio',
  },
  portfolioName: {
    type: String,
    default: '',
  },
  symbol: {
    type: String,
    uppercase: true,
  },
  strategy: {
    type: String,
    enum: ['dca', 'lump_sum', 'portfolio', 'gold'],
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
  projections: [{
    label: String,
    years: Number,
    totalBefore: Number,
    totalAfter: Number,
    profitPercent: Number,
    holdings: [{
      symbol: String,
      before: Number,
      after: Number,
      annualReturn: Number,
    }],
  }],
}, { timestamps: true });

module.exports = mongoose.model('Simulation', simulationSchema);
