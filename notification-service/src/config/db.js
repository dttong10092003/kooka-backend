const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Notification Service - MongoDB connected successfully');
    } catch (error) {
        console.error('❌ Notification Service - MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
