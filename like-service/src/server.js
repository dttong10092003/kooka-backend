require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const likeRoutes = require('./routes/likeRoutes');

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/likes', likeRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Like service is running' });
});

app.listen(PORT, () => {
    console.log(`Like service running on port ${PORT}`);
});
