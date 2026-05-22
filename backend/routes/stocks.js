const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

const STOCKS = [
  { symbol: 'FPT', name: 'FPT Corporation', pe: 23.4, eps: 5120, sector: 'Công nghệ', price: 118500 },
  { symbol: 'VNM', name: 'Vinamilk', pe: 16.8, eps: 4210, sector: 'Hàng tiêu dùng', price: 70600 },
  { symbol: 'VCB', name: 'Vietcombank', pe: 14.2, eps: 6380, sector: 'Ngân hàng', price: 90600 },
  { symbol: 'HPG', name: 'Hoa Phat Group', pe: 18.9, eps: 1560, sector: 'Thép', price: 29500 },
  { symbol: 'MWG', name: 'Mobile World Group', pe: 21.1, eps: 2840, sector: 'Bán lẻ', price: 59900 },
  { symbol: 'VIC', name: 'Vingroup', pe: 31.5, eps: 1380, sector: 'Bất động sản', price: 43500 },
  { symbol: 'SSI', name: 'SSI Securities', pe: 19.6, eps: 1720, sector: 'Chứng khoán', price: 33700 },
  { symbol: 'GAS', name: 'PV Gas', pe: 17.5, eps: 4620, sector: 'Năng lượng', price: 80800 },
  { symbol: 'KBC', name: 'Kinh Bac City', pe: 15.7, eps: 1840, sector: 'Khu công nghiệp', price: 31800 },
];

router.use(protect);

router.get('/search', (req, res) => {
  const q = String(req.query.q || '').trim().toUpperCase();
  const data = STOCKS.filter((stock) =>
    !q || stock.symbol.includes(q) || stock.name.toUpperCase().includes(q)
  );
  res.json({ success: true, data: data.slice(0, 8) });
});

router.get('/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  const stock = STOCKS.find((item) => item.symbol === symbol);
  if (!stock) return res.status(404).json({ success: false, message: 'Không tìm thấy mã cổ phiếu' });

  const history = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const wave = Math.sin(index / 1.8) * 0.08;
    const trend = index * 0.012;
    return {
      month,
      price: Math.round(stock.price * (0.88 + trend + wave)),
    };
  });

  res.json({ success: true, data: { ...stock, history } });
});

module.exports = router;
