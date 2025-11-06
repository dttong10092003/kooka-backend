require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const favoriteRoutes = require('./routes/favoriteRoutes');

const app = express();
const PORT = process.env.PORT || 5006;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/favorites', favoriteRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Favorite service is running' });
});

// Ping endpoint for UptimeRobot
app.get('/ping', (req, res) => {
    res.status(200).send('Service is alive!');
});

app.listen(PORT, () => {
    console.log(`Favorite service running on port ${PORT}`);
});
