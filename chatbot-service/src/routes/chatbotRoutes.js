const express = require('express');
const chatbotController = require('../controllers/chatbotController');

const router = express.Router();

// Health check
router.get('/health', chatbotController.healthCheck);

// Send message to chatbot
router.post('/chat', chatbotController.sendMessage);

// Get conversation history
router.get('/history/:sessionId', chatbotController.getHistory);

// Clear conversation history
router.delete('/history/:sessionId', chatbotController.clearHistory);

module.exports = router;
