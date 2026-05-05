const Portfolio = require('../models/Portfolio');

// GET /api/portfolios
const getPortfolios = async (req, res) => {
  try {
    const portfolios = await Portfolio.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: portfolios });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/portfolios
const createPortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.create({ ...req.body, userId: req.user._id, stocks: [] });
    res.status(201).json({ success: true, data: portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/portfolios/:id/stocks — thêm cổ phiếu vào portfolio
const addStock = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: 'Không tìm thấy portfolio' });

    portfolio.stocks.push(req.body);
    await portfolio.save();
    res.json({ success: true, data: portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/portfolios/:id/stocks/:stockId
const removeStock = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOne({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: 'Không tìm thấy portfolio' });

    portfolio.stocks = portfolio.stocks.filter(s => s._id.toString() !== req.params.stockId);
    await portfolio.save();
    res.json({ success: true, data: portfolio });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/portfolios/:id
const deletePortfolio = async (req, res) => {
  try {
    const portfolio = await Portfolio.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!portfolio) return res.status(404).json({ success: false, message: 'Không tìm thấy portfolio' });
    res.json({ success: true, message: 'Đã xóa portfolio' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getPortfolios, createPortfolio, addStock, removeStock, deletePortfolio };
