const chatbotService = require('../services/chatbotService');
const { v4: uuidv4 } = require('crypto');

class ChatbotController {
  // Send message to chatbot
  async sendMessage(req, res) {
    try {
      const { message, sessionId, userId, imageUrl, imageBase64 } = req.body;

      // At least message or image must be provided
      if (!message && !imageUrl && !imageBase64) {
        return res.status(400).json({
          success: false,
          error: 'Message, imageUrl, or imageBase64 is required'
        });
      }

      // Generate session ID if not provided
      const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Use imageBase64 if provided, otherwise use imageUrl
      const imageData = imageBase64 || imageUrl;

      const result = await chatbotService.chat(
        message || 'Món ăn trong ảnh này là gì?', 
        finalSessionId, 
        userId,
        imageData // Pass image data (base64 or URL)
      );

      return res.status(200).json({
        ...result,
        sessionId: finalSessionId
      });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get conversation history
  async getHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit) || 10;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const history = await chatbotService.getConversationHistory(sessionId, limit);

      return res.status(200).json({
        success: true,
        sessionId,
        history
      });
    } catch (error) {
      console.error('Error in getHistory:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Clear conversation history
  async clearHistory(req, res) {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required'
        });
      }

      const result = await chatbotService.clearConversation(sessionId);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in clearHistory:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Get all conversations of a user
  async getAllConversations(req, res) {
    try {
      const { userId } = req.query;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: 'userId is required'
        });
      }

      const Conversation = require('../models/Conversation');

      // Lấy tất cả conversations của user, sắp xếp theo updatedAt giảm dần
      const conversations = await Conversation.find({ userId })
        .sort({ updatedAt: -1 }) // Mới nhất lên trước
        .limit(50) // Giới hạn 50 conversations gần nhất
        .lean(); // Tối ưu performance

      return res.status(200).json({
        success: true,
        conversations: conversations || []
      });
    } catch (error) {
      console.error('Error in getAllConversations:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // Health check
  async healthCheck(req, res) {
    return res.status(200).json({
      success: true,
      message: 'Chatbot service is running',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new ChatbotController();
