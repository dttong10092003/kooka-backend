# Favorite Service

Microservice quản lý yêu thích (favorite) recipes trong hệ thống Kooka Backend.

## 📋 Mô tả

Favorite Service cho phép người dùng:
- Thêm/xóa recipe vào danh sách yêu thích
- Xem danh sách recipes đã yêu thích
- Đếm số lượng người dùng yêu thích một recipe
- Kiểm tra trạng thái yêu thích của recipe

## 🛠️ Công nghệ

- **Node.js** với **Express.js**
- **MongoDB** (Atlas) - Database riêng biệt
- **Mongoose** - ODM
- **Docker** - Containerization

## 📁 Cấu trúc thư mục

```
favorite-service/
├── src/
│   ├── config/
│   │   └── db.js                 # Kết nối MongoDB
│   ├── controllers/
│   │   └── favoriteController.js # Logic xử lý request
│   ├── models/
│   │   └── Favorite.js           # Schema Favorite
│   ├── routes/
│   │   └── favoriteRoutes.js     # API routes
│   ├── services/
│   │   └── favoriteService.js    # Business logic
│   └── server.js                 # Entry point
├── .env                          # Environment variables
├── Dockerfile                    # Docker configuration
├── package.json                  # Dependencies
├── API_TESTS.md                  # API testing guide
└── README.md                     # This file
```

## 🗄️ Database Schema

### Favorite Model
```javascript
{
  recipeId: String,      // ID của recipe
  userId: String,        // ID của user
  createdAt: Date,       // Thời gian tạo
  updatedAt: Date        // Thời gian cập nhật
}

// Unique Index: {recipeId + userId} - Ngăn duplicate favorites
```

## 🚀 Cài đặt

### Local Development

1. **Cài đặt dependencies:**
```bash
cd favorite-service
npm install
```

2. **Tạo file `.env`:**
```env
PORT=5006
MONGODB_URI=mongodb+srv://kookafavorite:kookafavorite@kookafavorite.mkvgsst.mongodb.net/?retryWrites=true&w=majority&appName=KookaFavorite
JWT_SECRET=your_jwt_secret_here
```

3. **Chạy service:**
```bash
# Development mode với nodemon
npm run dev

# Production mode
npm start
```

### Docker

```bash
# Build image
docker build -t favorite-service .

# Run container
docker run -p 5006:5006 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e JWT_SECRET="your_secret" \
  favorite-service
```

### Docker Compose

Service đã được tích hợp vào `docker-compose.yml` của project:

```bash
# Start all services
docker-compose up -d

# Start favorite service only
docker-compose up -d favorite-service

# View logs
docker-compose logs -f favorite-service
```

## 📡 API Endpoints

### Public Routes (Không cần authentication)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/api/favorites/recipe/:recipeId/count` | Lấy số lượt yêu thích |
| GET | `/api/favorites/recipe/:recipeId/user/:userId` | Kiểm tra user đã yêu thích |
| GET | `/api/favorites/user/:userId` | Lấy danh sách yêu thích của user |
| GET | `/api/favorites/recipe/:recipeId` | Lấy danh sách users yêu thích recipe |

### Protected Routes (Cần authentication)

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| POST | `/api/favorites/toggle` | Toggle yêu thích (add/remove) |
| POST | `/api/favorites/check-multiple` | Kiểm tra nhiều recipes cùng lúc |

### Health Check

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET | `/health` | Kiểm tra service status |

Xem chi tiết trong [API_TESTS.md](./API_TESTS.md)

## 🔐 Authentication

Service sử dụng middleware `verifyToken` từ API Gateway:
- JWT token được xác thực tại API Gateway
- User ID được truyền qua header `x-user-id`
- Protected routes tự động nhận userId từ header

## 🔄 Tích hợp với Recipe Service

Khi favorite count thay đổi, service tự động cập nhật:
- Gọi PATCH endpoint của Recipe Service
- Cập nhật `favoriteCount` field trong recipe
- Fallback nếu Recipe Service không khả dụng

## 📊 Features

### 1. Toggle Favorite
```javascript
POST /api/favorites/toggle
Body: { "recipeId": "123" }

// Add favorite nếu chưa có
// Remove favorite nếu đã có
```

### 2. Pagination
```javascript
GET /api/favorites/user/123?page=1&limit=20

// Hỗ trợ phân trang cho danh sách
// Default: page=1, limit=20
```

### 3. Bulk Check
```javascript
POST /api/favorites/check-multiple
Body: { "recipeIds": ["123", "456", "789"] }

// Kiểm tra nhiều recipes cùng lúc
// Tối ưu cho hiển thị danh sách
```

## 🔧 Environment Variables

| Variable | Mô tả | Mặc định |
|----------|-------|----------|
| `PORT` | Port của service | 5006 |
| `MONGODB_URI` | MongoDB connection string | - |
| `JWT_SECRET` | Secret key cho JWT | - |

## 📈 Monitoring

### Health Check
```bash
curl http://localhost:5006/health
```

### Logs
```bash
# Docker logs
docker-compose logs -f favorite-service

# Local logs
# Service tự động log kết nối DB và errors
```

## 🧪 Testing

Xem file [API_TESTS.md](./API_TESTS.md) cho:
- Chi tiết các API endpoints
- cURL examples
- Postman collection
- Test scenarios

## 🐛 Troubleshooting

### Service không start
```bash
# Kiểm tra MongoDB connection
# Đảm bảo MONGODB_URI đúng format
# Kiểm tra network connectivity
```

### Favorite không được tạo
```bash
# Kiểm tra authentication token
# Verify userId được truyền từ API Gateway
# Check MongoDB unique index conflicts
```

### Recipe Service không cập nhật
```bash
# Service vẫn hoạt động bình thường
# Log warning nhưng không throw error
# Favorite count sẽ được sync khi Recipe Service online
```

## 🤝 Tích hợp với API Gateway

Service được proxy qua API Gateway tại `/api/favorites`:

```javascript
// api-gateway/routes/favoriteRoute.js
const favoriteProxy = proxyFactory('http://favorite-service:5006');

router.post('/toggle', verifyToken, favoriteProxy);
```

## 📝 Development Notes

### Model Indexes
- Compound unique index trên `{recipeId, userId}` ngăn duplicate
- Indexes trên `recipeId` và `userId` riêng lẻ cho query performance

### Error Handling
- Service trả về error messages rõ ràng
- HTTP status codes chuẩn REST
- Async/await với try-catch blocks

### Best Practices
- Service độc lập, không phụ thuộc vào services khác
- Graceful degradation nếu Recipe Service unavailable
- Pagination mặc định để tránh overload
- Validation đầy đủ cho inputs

## 🔄 Versioning

Current version: **1.0.0**

## 📄 License

ISC

## 👨‍💻 Author

Kooka Backend Team

---

**Lưu ý:** Service này là một phần của Kooka Backend microservices architecture. Đảm bảo tất cả services (auth, recipe, API Gateway) đang chạy để test đầy đủ chức năng.
