require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const commentRoutes = require('./routes/commentRoutes');

const app = express();
const PORT = process.env.PORT || 5004;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
connectDB();

// Routes
app.use('/api/comments', commentRoutes);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'Comment service is running' });
});

app.listen(PORT, () => {
    console.log(`Comment service running on port ${PORT}`);
});
