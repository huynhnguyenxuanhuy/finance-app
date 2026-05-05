const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');

const monthRange = (month, year) => {
  const m = Number(month) || new Date().getMonth() + 1;
  const y = Number(year) || new Date().getFullYear();
  return {
    month: m,
    year: y,
    start: new Date(y, m - 1, 1),
    end: new Date(y, m, 0, 23, 59, 59),
  };
};

const getBudgets = async (req, res) => {
  try {
    const { month, year, start, end } = monthRange(req.query.month, req.query.year);
    const budgets = await Budget.find({ userId: req.user._id, month, year }).sort({ category: 1 });

    const spending = await Transaction.aggregate([
      {
        $match: {
          userId: req.user._id,
          type: 'expense',
          date: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: '$category', spent: { $sum: '$amount' } } },
    ]);
    const spendMap = spending.reduce((acc, item) => {
      acc[item._id] = item.spent;
      return acc;
    }, {});

    const data = budgets.map((budget) => {
      const spent = spendMap[budget.category] || 0;
      const obj = budget.toObject();
      obj.spent = spent;
      obj.remaining = budget.limitAmount - spent;
      obj.percentUsed = budget.limitAmount > 0 ? Math.round((spent / budget.limitAmount) * 10000) / 100 : 0;
      return obj;
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const createBudget = async (req, res) => {
  try {
    const { category, limitAmount, month, year } = req.body;
    const budget = await Budget.findOneAndUpdate(
      { userId: req.user._id, category, month, year },
      { category, limitAmount, month, year, userId: req.user._id },
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!budget) return res.status(404).json({ success: false, message: 'Không tìm thấy ngân sách' });
    res.json({ success: true, message: 'Đã xóa ngân sách' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getBudgets, createBudget, deleteBudget };
