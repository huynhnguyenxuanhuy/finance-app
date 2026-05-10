require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const connectDB = require('./config/db');

const app = express();

// Kết nối MongoDB Atlas
const dbReady = connectDB();

// Tạo thư mục uploads nếu chưa có
const uploadsDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(uploadsDir));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api', async (req, res, next) => {
  if (req.path === '/health') return next();

  if (!process.env.MONGODB_URI || !process.env.JWT_SECRET) {
    const missing = [
      !process.env.MONGODB_URI && 'MONGODB_URI',
      !process.env.JWT_SECRET && 'JWT_SECRET',
    ].filter(Boolean).join('/');

    return res.status(503).json({
      success: false,
      message: `API chưa cấu hình ${missing} trên server production`,
    });
  }

  const connected = await dbReady;
  if (!connected) {
    return res.status(503).json({
      success: false,
      message: 'API chưa kết nối được MongoDB Atlas',
    });
  }

  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/transactions', require('./routes/transactions'));
app.use('/api/portfolios', require('./routes/portfolios'));
app.use('/api/simulations', require('./routes/simulations'));
app.use('/api/budgets', require('./routes/budgets'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/stocks', require('./routes/stocks'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server đang chạy',
    databaseConfigured: Boolean(process.env.MONGODB_URI),
    jwtConfigured: Boolean(process.env.JWT_SECRET),
    time: new Date(),
  });
});

// Fallback về index.html cho SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: 'Lỗi server' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
    console.log(`📊 Môi trường: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = app;
