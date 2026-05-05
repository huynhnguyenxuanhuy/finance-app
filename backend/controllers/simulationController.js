const Simulation = require('../models/Simulation');

// Hàm tính mô phỏng DCA đơn giản (dùng dữ liệu giả lập tăng trưởng trung bình)
// Trong thực tế có thể tích hợp API giá cổ phiếu (Yahoo Finance, TCBS, VNDirect...)
const calculateDCA = (monthlyAmount, startDate, endDate, annualReturn = 0.12) => {
  const chartData = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  const monthlyReturn = annualReturn / 12;

  let totalInvested = 0;
  let currentValue = 0;
  let current = new Date(start);

  while (current <= end) {
    totalInvested += monthlyAmount;
    currentValue = (currentValue + monthlyAmount) * (1 + monthlyReturn);
    chartData.push({
      date: new Date(current),
      value: Math.round(currentValue),
      invested: Math.round(totalInvested),
    });
    current.setMonth(current.getMonth() + 1);
  }

  const profitPercent = totalInvested > 0
    ? ((currentValue - totalInvested) / totalInvested) * 100
    : 0;

  return { chartData, totalInvested: Math.round(totalInvested), resultValue: Math.round(currentValue), profitPercent: Math.round(profitPercent * 100) / 100 };
};

// POST /api/simulations/run
const runSimulation = async (req, res) => {
  try {
    const { symbol, strategy, monthlyAmount, initialAmount, startDate, endDate, annualReturn = 0.12 } = req.body;

    let simResult;
    if (strategy === 'dca') {
      simResult = calculateDCA(monthlyAmount, startDate, endDate, Number(annualReturn));
    } else {
      // lump_sum: đầu tư một lần, tăng trưởng 12%/năm
      const months = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24 * 30));
      const resultValue = initialAmount * Math.pow(1 + Number(annualReturn) / 12, months);
      simResult = {
        chartData: [],
        totalInvested: initialAmount,
        resultValue: Math.round(resultValue),
        profitPercent: Math.round(((resultValue - initialAmount) / initialAmount) * 10000) / 100,
      };
    }

    const simulation = await Simulation.create({
      userId: req.user._id,
      symbol,
      strategy,
      monthlyAmount: monthlyAmount || 0,
      initialAmount: initialAmount || 0,
      startDate,
      endDate,
      ...simResult,
    });

    res.status(201).json({ success: true, data: simulation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/simulations
const getSimulations = async (req, res) => {
  try {
    const simulations = await Simulation.find({ userId: req.user._id })
      .select('-chartData')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: simulations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/simulations/:id
const getSimulation = async (req, res) => {
  try {
    const simulation = await Simulation.findOne({ _id: req.params.id, userId: req.user._id });
    if (!simulation) return res.status(404).json({ success: false, message: 'Không tìm thấy mô phỏng' });
    res.json({ success: true, data: simulation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/simulations/:id
const deleteSimulation = async (req, res) => {
  try {
    await Simulation.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Đã xóa mô phỏng' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { runSimulation, getSimulations, getSimulation, deleteSimulation };
