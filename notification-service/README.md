# Notification Service

Service quản lý thông báo cho người dùng Kooka.

## ✨ Tính năng

### Tab "Công thức" (RECIPE)
- ✅ Thông báo khi món ăn yêu thích có cập nhật
- ✅ Thông báo khi món ăn yêu thích có video mới  
- ✅ Thông báo khi món ăn yêu thích thay đổi nguyên liệu

### Tab "Cộng đồng" (COMMUNITY)
- ✅ Thông báo khi review/comment được like
- ✅ Thông báo khi review/comment được reply

## 🚀 API Endpoints

### User APIs (qua API Gateway - cần authentication)

#### 1. Lấy danh sách thông báo
```http
GET /api/notifications?category=RECIPE&page=1&limit=20
```

#### 2. Lấy số thông báo chưa đọc
```http
GET /api/notifications/unread-count?category=RECIPE
```

#### 3. Đánh dấu thông báo đã đọc
```http
PUT /api/notifications/:id/read
```

#### 4. Đánh dấu tất cả đã đọc
```http
PUT /api/notifications/mark-all-read?category=RECIPE
```

#### 5. Xóa thông báo
```http
DELETE /api/notifications/:id
```

### Internal APIs (gọi trực tiếp từ các service khác)

#### 1. Tạo thông báo cập nhật recipe
```http
POST /api/notifications/internal/recipe-update
Body: {
  "recipeId": "...",
  "recipeName": "...",
  "recipeImage": "...",
  "updateType": "VIDEO|INGREDIENTS|GENERAL",
  "updateDetails": "..."
}
```

#### 2. Tạo thông báo like
```http
POST /api/notifications/internal/like
Body: {
  "commentId": "...",
  "likedByUserId": "..."
}
```

#### 3. Tạo thông báo reply
```http
POST /api/notifications/internal/reply
Body: {
  "parentCommentId": "...",
  "replyCommentId": "...",
  "repliedByUserId": "..."
}
```

## 🔧 Environment Variables

```env
PORT=3012
MONGO_URI=mongodb+srv://...
USER_SERVICE_URL=http://user-service:5002
RECIPE_SERVICE_URL=http://recipe-service:5000
REVIEW_SERVICE_URL=http://review-service:5007
FAVORITE_SERVICE_URL=http://favorite-service:5006
```

## 📦 Installation

```bash
npm install
```

## 🏃 Run

```bash
# Development
npm run dev

# Production
npm start
```

## 🐳 Docker

```bash
docker build -t notification-service .
docker run -p 3012:3012 --env-file .env notification-service
```

## 📚 Tích hợp với các service khác

Xem file [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md) để biết cách tích hợp với Frontend.
