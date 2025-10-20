const chatbotService = require('../services/chatbotService');
const { v4: uuidv4 } = require('crypto');

class ChatbotController {
  // Send message to chatbot
  async sendMessage(req, res) {
    try {
      const { message, sessionId, userId } = req.body;

      if (!message) {
        return res.status(400).json({
          success: false,
          error: 'Message is required'
        });
      }

      // Generate session ID if not provided
      const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const result = await chatbotService.chat(message, finalSessionId, userId);

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
