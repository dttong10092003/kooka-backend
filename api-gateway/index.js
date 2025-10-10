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

const app = express();
const PORT = process.env.PORT || 3000;

// Basic CORS
app.use(cors({
  origin: true,
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use(limiter);

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