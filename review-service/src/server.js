const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();
const PORT = process.env.PORT || 5007;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to Database
connectDB();

// Routes
app.use('/api/reviews', reviewRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Review Service is running' });
});

app.listen(PORT, () => {
    console.log(`Review Service is running on port ${PORT}`);
});
