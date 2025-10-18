# Review Service

Service quản lý đánh giá (rating) cho các công thức nấu ăn.

## Features

- Tạo review khi tạo comment (chỉ parent comment)
- Cập nhật rating
- Xóa review
- Lấy review theo comment
- Lấy tất cả reviews của một recipe
- Lấy review của user cho một recipe cụ thể
- Tính toán và cập nhật rating statistics cho recipe

## API Endpoints

### POST /api/reviews
Tạo review mới (được gọi khi tạo comment)
```json
{
  "recipeId": "recipe_id",
  "commentId": "comment_id",
  "rating": 5
}
```

### PUT /api/reviews/comment/:commentId
Cập nhật rating của review

### DELETE /api/reviews/comment/:commentId
Xóa review

### GET /api/reviews/comment/:commentId
Lấy review theo comment ID

### GET /api/reviews/recipe/:recipeId
Lấy tất cả reviews của recipe (có pagination)

### GET /api/reviews/recipe/:recipeId/user
Lấy review của user hiện tại cho recipe

### GET /api/reviews/recipe/:recipeId/stats
Lấy thống kê rating của recipe

## Environment Variables

```
PORT=5007
MONGODB_URI=your_mongodb_connection_string
RECIPE_SERVICE_URL=http://recipe-service:5000
```

## Notes

- Mỗi user chỉ có thể review 1 lần cho 1 recipe
- Rating phải từ 1 đến 5
- Chỉ parent comment mới có review (reply không có)
- Khi tạo/cập nhật/xóa review, service sẽ tự động cập nhật rating của recipe
