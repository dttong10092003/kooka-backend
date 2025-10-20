# 🤖 Kooka Chatbot Service

AI Chatbot Service sử dụng Google Gemini API để hỗ trợ người dùng tìm kiếm công thức nấu ăn, gợi ý món ăn và trả lời các câu hỏi về nấu ăn.

## ✨ Tính năng

- 🔍 **Tìm kiếm công thức nấu ăn** thông minh
- 🍳 **Gợi ý món ăn** dựa trên nguyên liệu có sẵn
- 📊 **Truy vấn thông tin** về danh mục, ẩm thực, nguyên liệu
- 💬 **Hỗ trợ hội thoại** với ngữ cảnh
- 📝 **Lưu lịch sử chat** theo session
- 🚀 **Kết nối trực tiếp** với các service khác

## 🛠️ Công nghệ

- Node.js + Express
- Google Gemini API
- MongoDB (lưu lịch sử chat)
- Axios (gọi API các service khác)

## 📦 Cài đặt

```bash
cd chatbot-service
npm install
```

## 🔧 Cấu hình

Tạo file `.env`:

```env
PORT=5008
GEMINI_API_KEY=your_gemini_api_key
RECIPE_SERVICE_URL=http://localhost:5000
USER_SERVICE_URL=http://localhost:5002
REVIEW_SERVICE_URL=http://localhost:5007
PYTHON_COOK_SERVICE_URL=http://localhost:8000
MONGODB_URI=mongodb://localhost:27017/chatbot
```

## 🚀 Chạy service

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker build -t chatbot-service .
docker run -p 5008:5008 --env-file .env chatbot-service
```

## 📡 API Endpoints

### 1. Health Check
```
GET /api/chatbot/health
```

### 2. Gửi tin nhắn tới Chatbot
```
POST /api/chatbot/chat
```

**Request Body:**
```json
{
  "message": "Tìm món ăn có gà và khoai tây",
  "sessionId": "session_123",
  "userId": "user_456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Dựa trên nguyên liệu gà và khoai tây, tôi gợi ý cho bạn các món...",
  "intent": "search_recipe",
  "sessionId": "session_123",
  "data": {
    "recipes": [...]
  }
}
```

### 3. Lấy lịch sử hội thoại
```
GET /api/chatbot/history/:sessionId?limit=10
```

**Response:**
```json
{
  "success": true,
  "sessionId": "session_123",
  "history": [
    {
      "role": "user",
      "content": "Tìm món ăn có gà",
      "timestamp": "2025-10-20T10:00:00.000Z"
    },
    {
      "role": "assistant",
      "content": "Tôi tìm thấy các món...",
      "timestamp": "2025-10-20T10:00:01.000Z"
    }
  ]
}
```

### 4. Xóa lịch sử hội thoại
```
DELETE /api/chatbot/history/:sessionId
```

## 💡 Ví dụ sử dụng

### Tìm kiếm công thức
```bash
curl -X POST http://localhost:5008/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tìm món phở bò",
    "sessionId": "session_001"
  }'
```

### Gợi ý món ăn theo nguyên liệu
```bash
curl -X POST http://localhost:5008/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tôi có gà, khoai tây và hành. Nên nấu món gì?",
    "sessionId": "session_002"
  }'
```

### Hỏi về danh mục món ăn
```bash
curl -X POST http://localhost:5008/api/chatbot/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Có những loại món ăn nào?",
    "sessionId": "session_003"
  }'
```

## 🎯 Các loại Intent được hỗ trợ

1. **search_recipe** - Tìm kiếm công thức nấu ăn
2. **get_recipe_details** - Lấy chi tiết công thức
3. **list_recipes** - Liệt kê danh sách món ăn
4. **get_ingredients** - Lấy danh sách nguyên liệu
5. **get_categories** - Lấy danh mục món ăn
6. **get_cuisines** - Lấy loại ẩm thực
7. **recommend_recipe** - Gợi ý món ăn
8. **get_reviews** - Xem đánh giá món ăn
9. **general_question** - Câu hỏi chung

## 🔗 Kết nối với các Service

Chatbot service tự động kết nối với:

- **Recipe Service** (port 5000) - Lấy thông tin công thức
- **User Service** (port 5002) - Thông tin người dùng
- **Review Service** (port 5007) - Đánh giá và bình luận
- **Python Cook Service** (port 8000) - Tìm kiếm nâng cao

## 📊 Database Schema

### Conversation Model
```javascript
{
  userId: String,
  sessionId: String (indexed),
  messages: [{
    role: 'user' | 'assistant',
    content: String,
    timestamp: Date,
    metadata: Object
  }],
  createdAt: Date,
  updatedAt: Date
}
```

## 🐛 Debug

Xem logs trong console để theo dõi:
- Intent analysis
- Data fetching
- Response generation

## 📝 Notes

- Session ID tự động tạo nếu không được cung cấp
- Lịch sử chat tự động xóa sau 30 ngày
- Giới hạn 2048 tokens cho response của Gemini
- Hỗ trợ tiếng Việt

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC
