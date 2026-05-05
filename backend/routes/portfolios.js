const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getPortfolios, createPortfolio, addStock, removeStock, deletePortfolio } = require('../controllers/portfolioController');

router.use(protect);
router.route('/').get(getPortfolios).post(createPortfolio);
router.delete('/:id', deletePortfolio);
router.post('/:id/stocks', addStock);
router.delete('/:id/stocks/:stockId', removeStock);

module.exports = router;
