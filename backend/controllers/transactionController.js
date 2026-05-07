const Transaction = require('../models/Transaction');

const buildQuarterlyFinancialReport = async (userId, year) => {
  const reportYear = Number(year) || new Date().getFullYear();
  const start = new Date(reportYear, 0, 1);
  const end = new Date(reportYear, 11, 31, 23, 59, 59);

  const rows = await Transaction.aggregate([
    { $match: { userId, date: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: {
          quarter: { $ceil: { $divide: [{ $month: '$date' }, 3] } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);

  return Array.from({ length: 4 }, (_, index) => {
    const quarter = index + 1;
    const revenue = rows
      .filter(item => item._id.quarter === quarter && item._id.type === 'income')
      .reduce((sum, item) => sum + item.total, 0);
    const expense = rows
      .filter(item => item._id.quarter === quarter && item._id.type === 'expense')
      .reduce((sum, item) => sum + item.total, 0);

    return {
      quarter,
      label: `Quý ${quarter}`,
      revenue,
      expense,
      profit: revenue - expense,
    };
  });
};

// GET /api/transactions
const getTransactions = async (req, res) => {
  try {
    const { type, category, startDate, endDate, page = 1, limit = 20 } = req.query;
    const filter = { userId: req.user._id };

    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    const total = await Transaction.countDocuments(filter);
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, total, page: Number(page), data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/transactions
const createTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create({ ...req.body, userId: req.user._id });
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/transactions/:id
const updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!transaction) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    res.json({ success: true, data: transaction });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/transactions/:id
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!transaction) return res.status(404).json({ success: false, message: 'Không tìm thấy giao dịch' });
    res.json({ success: true, message: 'Đã xóa giao dịch' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transactions/summary
const getSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const result = await Transaction.aggregate([
      { $match: { userId: req.user._id, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);

    const summary = { income: 0, expense: 0 };
    result.forEach(r => { summary[r._id] = r.total; });
    summary.balance = summary.income - summary.expense;

    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transactions/by-category
const getByCategory = async (req, res) => {
  try {
    const { month, year, type } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const data = await Transaction.aggregate([
      { $match: { userId: req.user._id, type, date: { $gte: start, $lte: end } } },
      { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transactions/quarterly
const getQuarterlyFinancialReport = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const data = await buildQuarterlyFinancialReport(req.user._id, year);
    res.json({ success: true, year, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/transactions/quarterly/export
const exportQuarterlyFinancialReport = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const data = await buildQuarterlyFinancialReport(req.user._id, year);
    const header = ['Mốc thời gian', 'Doanh thu', 'Chi phí', 'Lợi nhuận'];
    const csv = [header, ...data.map(item => [item.label, item.revenue, item.expense, item.profit])]
      .map(row => row.map(cell => `"${String(cell).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="bieu-do-tai-chinh-theo-quy-${year}.csv"`);
    res.send('\ufeff' + csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getSummary,
  getByCategory,
  getQuarterlyFinancialReport,
  exportQuarterlyFinancialReport,
};
