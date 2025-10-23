# Review & Comment Service

Service quản lý đánh giá (rating) và bình luận (comment) cho các công thức nấu ăn. Service này là kết quả gộp của comment-service và review-service cũ.

## Features

### Review Features
- Tạo review khi tạo comment (chỉ parent comment)
- Cập nhật rating
- Xóa review
- Lấy review theo comment
- Lấy tất cả reviews của một recipe
- Lấy review của user cho một recipe cụ thể
- Tính toán và cập nhật rating statistics cho recipe

### Comment Features
- Tạo comment với rating (parent comment)
- Tạo reply cho comment (không có rating)
- Lấy comments theo recipe với pagination
- Lấy replies của một comment
- Cập nhật comment
- Xóa comment (cascade delete replies)
- Đếm số lượng comments của recipe
- Cập nhật like count

## API Endpoints

### Review Endpoints

#### POST /api/reviews
Tạo review mới (được gọi khi tạo comment)
```json
{
  "recipeId": "recipe_id",
  "commentId": "comment_id",
  "rating": 5
}
```

#### PUT /api/reviews/comment/:commentId
Cập nhật rating của review

#### DELETE /api/reviews/comment/:commentId
Xóa review

#### GET /api/reviews/comment/:commentId
Lấy review theo comment ID

#### GET /api/reviews/recipe/:recipeId
Lấy tất cả reviews của recipe (có pagination)

#### GET /api/reviews/recipe/:recipeId/user
Lấy review của user hiện tại cho recipe

#### GET /api/reviews/recipe/:recipeId/stats
Lấy thống kê rating của recipe

### Comment Endpoints

#### POST /api/comments
Tạo comment mới (parent comment cần có rating, reply không cần)
```json
{
  "recipeId": "recipe_id",
  "content": "Comment content",
  "rating": 5,  // Required cho parent comment
  "parentCommentId": null  // null cho parent comment, có giá trị cho reply
}
```

#### GET /api/comments/recipe/:recipeId
Lấy comments theo recipe (có pagination, bao gồm cả replies)

#### GET /api/comments/:commentId/replies
Lấy tất cả replies của một comment

#### GET /api/comments/recipe/:recipeId/count
Đếm số lượng comments của recipe

#### PUT /api/comments/:commentId
Cập nhật nội dung comment

#### DELETE /api/comments/:commentId
Xóa comment (xóa cả replies nếu là parent comment)

#### PATCH /api/comments/:commentId/likes
Cập nhật like count (được gọi từ like-service)

## Environment Variables

```
PORT=5007
MONGODB_URI=your_mongodb_connection_string
RECIPE_SERVICE_URL=http://recipe-service:5000
```

## Notes

- Mỗi user chỉ có thể review 1 lần cho 1 recipe
- Rating phải từ 1 đến 5
- Chỉ parent comment mới có review và rating (reply không có)
- Khi tạo parent comment, review tự động được tạo
- Khi xóa parent comment, review cũng tự động bị xóa
- Khi tạo/cập nhật/xóa review, service sẽ tự động cập nhật rating của recipe
- Comment có cấu trúc 2 cấp: parent comment và replies (không có nested replies sâu hơn)
