const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getBudgets, createBudget, deleteBudget } = require('../controllers/budgetController');

router.use(protect);
router.route('/').get(getBudgets).post(createBudget);
router.delete('/:id', deleteBudget);

module.exports = router;
