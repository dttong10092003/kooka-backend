const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const authRoutes = require('./routes/authRoute');
const userRoutes = require('./routes/userRoute');
const recipeRoutes = require('./routes/recipeRoute');
const searchRoutes = require('./routes/searchRoute');
const ingredientRoutes = require('./routes/ingredientRoute');
const ingredientTypeRoutes = require('./routes/ingredientTypeRoute');
const tagRoutes = require('./routes/tagRoute');
const categoryRoutes = require('./routes/categoryRoute');
const cuisineRoutes = require('./routes/cuisineRoute');
const commentRoutes = require('./routes/commentRoute');
const likeRoutes = require('./routes/likeRoute');
const favoriteRoutes = require('./routes/favoriteRoute');
const reviewRoutes = require('./routes/reviewRoute');
const chatbotRoutes = require('./routes/chatbotRoute');
const mealPlanRoutes = require('./routes/mealPlanRoute');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS Configuration
const allowedOrigins = [
  'http://localhost:4000',  // Frontend URL
  'http://localhost:5173',  // Vite dev server (backup)
  'http://localhost:3000',  // Alternative port
  process.env.FRONTEND_URL  // Production URL from env
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, log warning but allow
      console.warn(`⚠️  CORS: Origin ${origin} not in whitelist`);
      callback(null, true); // Allow in dev, change to callback(new Error('Not allowed by CORS')) in production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 86400
}));

// Rate limiting
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: { error: 'Too many requests, please try again later.' }
// });
// app.use(limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'API Gateway is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/recipes', recipeRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/ingredient-types', ingredientTypeRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cuisines', cuisineRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/mealplans', mealPlanRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});

module.exports = app;