const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTransactions, createTransaction, updateTransaction,
  deleteTransaction, getSummary, getByCategory,
} = require('../controllers/transactionController');

router.use(protect);

router.get('/summary', getSummary);
router.get('/by-category', getByCategory);
router.route('/').get(getTransactions).post(createTransaction);
router.route('/:id').put(updateTransaction).delete(deleteTransaction);

module.exports = router;
