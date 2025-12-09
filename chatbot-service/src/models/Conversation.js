const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: false
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for getAllConversations performance
conversationSchema.index({ userId: 1, updatedAt: -1 });
conversationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

module.exports = mongoose.model('Conversation', conversationSchema);
