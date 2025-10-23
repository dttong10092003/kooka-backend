const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const chatbotRoutes = require('./routes/chatbotRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5008;

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
// Increase body size limit for image data (base64 can be large)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/chatbot', chatbotRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Kooka Chatbot Service',
    version: '1.0.0',
    endpoints: {
      chat: 'POST /api/chatbot/chat',
      history: 'GET /api/chatbot/history/:sessionId',
      clearHistory: 'DELETE /api/chatbot/history/:sessionId',
      health: 'GET /api/chatbot/health'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`🤖 Chatbot Service running on port ${PORT}`);
  console.log(`📡 Gemini API: ${process.env.GEMINI_API_KEY ? 'Connected' : 'Not configured'}`);
});

module.exports = app;
