const Simulation = require('../models/Simulation');
const Portfolio = require('../models/Portfolio');
const Asset = require('../models/Asset');

const STOCK_RETURN_PROFILE = {
  FPT: 0.16,
  VNM: 0.09,
  KBC: 0.14,
  VCB: 0.11,
  HPG: 0.12,
  MWG: 0.13,
  VIC: 0.08,
  SSI: 0.15,
  GAS: 0.1,
};

const getHoldingAmount = (stock) => Number(stock.investedAmount) || (Number(stock.shares) || 0) * (Number(stock.buyPrice) || 0);

const calculatePortfolioProjection = (portfolio) => {
  const horizons = [
    { years: 1, label: '1 năm' },
    { years: 5, label: '5 năm' },
    { years: 10, label: '10 năm' },
  ];

  const holdings = portfolio.stocks.map((stock) => {
    const symbol = String(stock.symbol || '').toUpperCase();
    return {
      symbol,
      before: getHoldingAmount(stock),
      annualReturn: STOCK_RETURN_PROFILE[symbol] || 0.1,
    };
  });

  const chartData = Array.from({ length: 11 }, (_, year) => {
    const value = holdings.reduce((sum, item) => sum + item.before * Math.pow(1 + item.annualReturn, year), 0);
    return {
      date: new Date(new Date().getFullYear() + year, 0, 1),
      value: Math.round(value),
      invested: Math.round(holdings.reduce((sum, item) => sum + item.before, 0)),
    };
  });

  const projections = horizons.map((horizon) => {
    const rows = holdings.map((item) => ({
      symbol: item.symbol,
      before: Math.round(item.before),
      after: Math.round(item.before * Math.pow(1 + item.annualReturn, horizon.years)),
      annualReturn: item.annualReturn,
    }));
    const totalBefore = rows.reduce((sum, item) => sum + item.before, 0);
    const totalAfter = rows.reduce((sum, item) => sum + item.after, 0);
    return {
      ...horizon,
      totalBefore,
      totalAfter,
      profitPercent: totalBefore > 0 ? Math.round(((totalAfter - totalBefore) / totalBefore) * 10000) / 100 : 0,
      holdings: rows,
    };
  });

  const totalInvested = projections[0]?.totalBefore || 0;
  const resultValue = projections[0]?.totalAfter || 0;
  const profitPercent = totalInvested > 0 ? Math.round(((resultValue - totalInvested) / totalInvested) * 10000) / 100 : 0;

  return { chartData, projections, totalInvested, resultValue, profitPercent };
};

const buildGoldForecast = (amount) => {
  const basePrice = 120000000;
  const quantity = amount / basePrice;
  const hourly = Array.from({ length: 30 * 24 }, (_, index) => {
    const trend = index * 0.00018;
    const wave = Math.sin(index / 18) * 0.012 + Math.cos(index / 41) * 0.006;
    const price = Math.round(basePrice * (1 + trend + wave));
    return {
      at: new Date(Date.now() + index * 60 * 60 * 1000),
      price,
      value: Math.round(price * quantity),
    };
  });

  const daily = hourly.filter((_, index) => index % 24 === 0).map((point, index) => ({ ...point, day: index + 1 }));
  const minPoint = hourly.reduce((best, point) => point.price < best.price ? point : best, hourly[0]);
  const maxPoint = hourly.reduce((best, point) => point.price > best.price ? point : best, hourly[0]);

  return {
    basePrice,
    quantity,
    totalInvested: Math.round(amount),
    resultValue: hourly[hourly.length - 1].value,
    profitPercent: Math.round(((hourly[hourly.length - 1].value - amount) / amount) * 10000) / 100,
    buyPoint: minPoint,
    sellPoint: maxPoint,
    daily,
    hourly,
  };
};

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
    const { symbol, strategy, monthlyAmount, initialAmount, startDate, endDate, annualReturn = 0.12, portfolioId } = req.body;

    if (strategy === 'portfolio') {
      const portfolio = await Portfolio.findOne({ _id: portfolioId, userId: req.user._id });
      if (!portfolio) return res.status(404).json({ success: false, message: 'Không tìm thấy danh mục đầu tư' });
      if (!portfolio.stocks.length) return res.status(400).json({ success: false, message: 'Danh mục chưa có cổ phiếu để mô phỏng' });

      const simResult = calculatePortfolioProjection(portfolio);
      const simulation = await Simulation.create({
        userId: req.user._id,
        portfolioId: portfolio._id,
        portfolioName: portfolio.name,
        symbol: portfolio.stocks.map(item => item.symbol).join(', '),
        strategy: 'portfolio',
        startDate: new Date(),
        endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 10)),
        ...simResult,
      });

      return res.status(201).json({ success: true, data: simulation });
    }

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

const runGoldSimulation = async (req, res) => {
  try {
    const { assetId, amount } = req.body;
    let investedAmount = Number(amount) || 0;
    let assetName = 'Vàng';

    if (assetId) {
      const asset = await Asset.findOne({ _id: assetId, userId: req.user._id, type: 'gold' });
      if (!asset) return res.status(404).json({ success: false, message: 'Không tìm thấy tài sản vàng' });
      investedAmount = investedAmount || asset.value;
      assetName = asset.name;
    }

    if (!investedAmount) return res.status(400).json({ success: false, message: 'Vui lòng nhập số tiền vàng cần mô phỏng' });

    const forecast = buildGoldForecast(investedAmount);
    const simulation = await Simulation.create({
      userId: req.user._id,
      symbol: 'GOLD',
      portfolioName: assetName,
      strategy: 'gold',
      initialAmount: forecast.totalInvested,
      startDate: new Date(),
      endDate: forecast.hourly[forecast.hourly.length - 1].at,
      totalInvested: forecast.totalInvested,
      resultValue: forecast.resultValue,
      profitPercent: forecast.profitPercent,
      chartData: forecast.daily.map(point => ({ date: point.at, value: point.value, invested: forecast.totalInvested })),
    });

    res.status(201).json({ success: true, data: { simulation, forecast } });
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

module.exports = { runSimulation, runGoldSimulation, getSimulations, getSimulation, deleteSimulation };
