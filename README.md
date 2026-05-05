# FinanceApp — Quản lý tài chính & Mô phỏng đầu tư cổ phiếu

## Cài đặt & chạy

### 1. Clone và cài dependencies
```bash
npm install
```

### 2. Tạo file `.env`
Copy file `.env.example` thành `.env` rồi điền thông tin:
```
cp .env.example .env
```

Mở `.env` và điền:
```
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/financeapp?retryWrites=true&w=majority
JWT_SECRET=bat_ky_chuoi_bi_mat_nao_do
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

> **Lấy MONGODB_URI từ đâu?**
> 1. Vào [MongoDB Atlas](https://cloud.mongodb.com) → tạo tài khoản miễn phí
> 2. Tạo cluster (chọn Free tier M0)
> 3. Database Access → tạo user + password
> 4. Network Access → Add IP Address → Allow from Anywhere (0.0.0.0/0)
> 5. Connect → Drivers → Copy connection string → thay `<password>`

### 3. Chạy dev
```bash
npm run dev
```

Mở trình duyệt: `http://localhost:5000`

---

## Cấu trúc project
```
finance-app/
├── backend/
│   ├── config/db.js          # Kết nối MongoDB Atlas
│   ├── models/               # Mongoose models
│   │   ├── User.js
│   │   ├── Transaction.js
│   │   ├── Budget.js
│   │   ├── Asset.js
│   │   ├── Portfolio.js
│   │   └── Simulation.js
│   ├── controllers/          # Business logic
│   ├── routes/               # API endpoints
│   ├── middleware/auth.js    # JWT middleware
│   └── server.js             # Entry point
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
├── uploads/                  # Avatar uploads (auto-created)
├── .env.example
└── package.json
```

## API Endpoints

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/auth/register` | Đăng ký |
| POST | `/api/auth/login` | Đăng nhập |
| GET | `/api/auth/me` | Thông tin user |
| GET | `/api/transactions` | Danh sách giao dịch |
| POST | `/api/transactions` | Thêm giao dịch |
| GET | `/api/transactions/summary` | Tổng thu/chi theo tháng |
| GET | `/api/transactions/by-category` | Theo danh mục |
| GET | `/api/budgets` | Danh sách ngân sách theo tháng |
| POST | `/api/budgets` | Tạo/cập nhật ngân sách |
| DELETE | `/api/budgets/:id` | Xóa ngân sách |
| GET | `/api/assets` | Danh sách tài sản + tổng hợp |
| POST | `/api/assets` | Thêm tài sản |
| PUT | `/api/assets/:id` | Cập nhật tài sản |
| DELETE | `/api/assets/:id` | Xóa tài sản |
| GET | `/api/portfolios` | Danh sách portfolio |
| POST | `/api/portfolios` | Tạo portfolio |
| POST | `/api/portfolios/:id/stocks` | Thêm cổ phiếu |
| POST | `/api/simulations/run` | Chạy mô phỏng DCA |
| GET | `/api/simulations` | Lịch sử mô phỏng |
| GET | `/api/stocks/search?q=FPT` | Tìm mã cổ phiếu demo |
| GET | `/api/stocks/:symbol` | Xem P/E, EPS và giá demo |
| POST | `/api/auth/forgot-password` | Tạo mã đặt lại mật khẩu demo |
| POST | `/api/auth/reset-password/:token` | Đổi mật khẩu bằng token |

## Ghi chú nghiệm thu

- Frontend dùng HTML/CSS/JS vanilla, không cần framework.
- Ngân sách và tài sản đã lưu qua API/MongoDB, không còn phụ thuộc localStorage.
- Xuất Excel đang ở dạng CSV mở được bằng Excel; xuất PDF dùng hộp thoại in/lưu PDF của trình duyệt.
- Dữ liệu P/E, EPS và giá lịch sử là dữ liệu demo trong backend để phục vụ bài nộp. Muốn dùng số liệu thật cần tích hợp API chứng khoán riêng.
