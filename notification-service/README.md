# Notification Service

Service quản lý thông báo cho người dùng Kooka.

**Lưu ý:** Service này sử dụng authentication từ API Gateway. Tất cả requests từ user phải đi qua API Gateway, nơi sẽ verify token và thêm `x-user-id` vào headers.

## Tính năng

### Tab "Công thức" (RECIPE)
- Thông báo khi món ăn yêu thích có cập nhật
- Thông báo khi món ăn yêu thích có video mới
- Thông báo khi món ăn yêu thích thay đổi nguyên liệu

### Tab "Cộng đồng" (COMMUNITY)
- Thông báo khi review/comment được like
- Thông báo khi review/comment được reply

## API Endpoints

### User APIs (thông qua API Gateway với authentication)

**Tất cả user APIs phải được gọi qua API Gateway tại `/api/notifications`**

#### 1. Lấy danh sách thông báo
```
GET /api/notifications
Query params:
  - category: 'RECIPE' | 'COMMUNITY' (optional)
  - isRead: 'true' | 'false' (optional)
  - page: number (default: 1)
  - limit: number (default: 20)
```

#### 2. Lấy số thông báo chưa đọc
```
GET /api/notifications/unread-count
Query params:
  - category: 'RECIPE' | 'COMMUNITY' (optional)
```

#### 3. Đánh dấu thông báo đã đọc
```
PUT /api/notifications/:id/read
```

#### 4. Đánh dấu tất cả đã đọc
```
PUT /api/notifications/mark-all-read
Query params:
  - category: 'RECIPE' | 'COMMUNITY' (optional)
```

#### 5. Xóa thông báo
```
DELETE /api/notifications/:id
```

### Internal APIs (được gọi từ các service khác)

#### 1. Tạo thông báo cập nhật recipe
```
POST /api/notifications/internal/recipe-update
Body:
{
  "recipeId": "string",
  "recipeName": "string",
  "recipeImage": "string",
  "updateType": "VIDEO" | "INGREDIENTS" | "GENERAL",
  "updateDetails": "string"
}
```

#### 2. Tạo thông báo like
```
POST /api/notifications/internal/like
Body:
{
  "commentId": "string",
  "likedByUserId": "string"
}
```

#### 3. Tạo thông báo reply
```
POST /api/notifications/internal/reply
Body:
{
  "parentCommentId": "string",
  "replyCommentId": "string",
  "repliedByUserId": "string"
}
```

## Tích hợp với các service khác

### Recipe Service
Khi cập nhật recipe (video, ingredients, v.v.), gọi:
```javascript
await axios.post('http://notification-service:3012/api/notifications/internal/recipe-update', {
  recipeId,
  recipeName,
  recipeImage,
  updateType: 'VIDEO', // hoặc 'INGREDIENTS', 'GENERAL'
  updateDetails: 'Mô tả cập nhật'
});
```

### Like Service
Khi tạo like mới, gọi:
```javascript
await axios.post('http://notification-service:3012/api/notifications/internal/like', {
  commentId,
  likedByUserId
});
```

### Review Service
Khi tạo reply comment, gọi:
```javascript
await axios.post('http://notification-service:3012/api/notifications/internal/reply', {
  parentCommentId,
  replyCommentId,
  repliedByUserId
});
```

## Environment Variables

```
PORT=3012
MONGO_URI=mongodb://mongo:27017/kooka_notifications
```

## Docker

Build:
```bash
docker build -t notification-service .
```

Run:
```bash
docker run -p 3012:3012 --env-file .env notification-service
```
