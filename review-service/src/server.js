const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const reviewRoutes = require('./routes/reviewRoutes');
const commentRoutes = require('./routes/commentRoutes');
const viewRoutes = require('./routes/viewRoutes');

const app = express();
const PORT = process.env.PORT || 5007;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// Routes
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/views', viewRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Review & Comment Service is running' });
});

app.listen(PORT, () => {
    console.log(`Review & Comment Service is running on port ${PORT}`);
});
