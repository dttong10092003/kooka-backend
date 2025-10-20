const { getModel } = require('../config/gemini');
const dataFetchService = require('./dataFetchService');
const Conversation = require('../models/Conversation');

class ChatbotService {
  constructor() {
    this.model = getModel();
  }

  // Analyze user intent and extract entities
  async analyzeIntent(userMessage) {
    const intentPrompt = `
Phân tích ý định của người dùng và trích xuất thông tin từ câu hỏi sau:
"${userMessage}"

Trả về JSON với format sau (chỉ trả JSON, không có text khác):
{
  "intent": "search_recipe | get_recipe_details | list_recipes | get_ingredients | get_categories | get_cuisines | recommend_recipe | get_reviews | general_question",
  "entities": {
    "recipeName": "tên món ăn nếu có",
    "ingredients": ["danh sách nguyên liệu nếu có"],
    "category": "danh mục nếu có",
    "cuisine": "ẩm thực nếu có",
    "recipeId": "ID công thức nếu có"
  },
  "needsData": true/false
}
`;

    try {
      const result = await this.model.generateContent(intentPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { intent: 'general_question', entities: {}, needsData: false };
    } catch (error) {
      console.error('Error analyzing intent:', error);
      return { intent: 'general_question', entities: {}, needsData: false };
    }
  }

  // Fetch relevant data based on intent
  async fetchRelevantData(intent, entities) {
    let data = {};

    try {
      switch (intent) {
        case 'search_recipe':
          if (entities.recipeName) {
            data.recipes = await dataFetchService.searchRecipes(entities.recipeName);
          } else if (entities.ingredients && entities.ingredients.length > 0) {
            data.recipes = await dataFetchService.getRecipesByIngredients(entities.ingredients);
          }
          break;

        case 'get_recipe_details':
          if (entities.recipeId) {
            data.recipe = await dataFetchService.getRecipeById(entities.recipeId);
            data.reviews = await dataFetchService.getReviewsByRecipeId(entities.recipeId);
            data.comments = await dataFetchService.getCommentsByRecipeId(entities.recipeId);
          }
          break;

        case 'list_recipes':
          data.recipes = await dataFetchService.getRecipes(20);
          break;

        case 'get_ingredients':
          data.ingredients = await dataFetchService.getIngredients();
          break;

        case 'get_categories':
          data.categories = await dataFetchService.getCategories();
          break;

        case 'get_cuisines':
          data.cuisines = await dataFetchService.getCuisines();
          break;

        case 'recommend_recipe':
          data.popularRecipes = await dataFetchService.getPopularRecipes(10);
          if (entities.category) {
            const searchResult = await dataFetchService.advancedSearch({ category: entities.category });
            data.categoryRecipes = searchResult;
          }
          break;

        case 'get_reviews':
          if (entities.recipeId) {
            data.reviews = await dataFetchService.getReviewsByRecipeId(entities.recipeId);
          }
          break;

        default:
          // No specific data needed
          break;
      }
    } catch (error) {
      console.error('Error fetching relevant data:', error);
    }

    return data;
  }

  // Generate response using Gemini with context
  async generateResponse(userMessage, relevantData, conversationHistory = []) {
    let contextPrompt = `Bạn là trợ lý ảo thông minh của ứng dụng nấu ăn Kooka. 
Nhiệm vụ của bạn là giúp người dùng tìm kiếm công thức nấu ăn, gợi ý món ăn, trả lời câu hỏi về nấu ăn.

Hãy trả lời một cách thân thiện, nhiệt tình và NGẮN GỌN (tối đa 500 từ).

`;

    // Add conversation history (only last 2 exchanges to save tokens)
    if (conversationHistory.length > 0) {
      contextPrompt += '\n### Lịch sử hội thoại:\n';
      const recentHistory = conversationHistory.slice(-4); // Last 2 exchanges
      recentHistory.forEach(msg => {
        contextPrompt += `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}\n`;
      });
    }

    // Add relevant data if available (summarize if too long)
    if (Object.keys(relevantData).length > 0) {
      contextPrompt += '\n### Dữ liệu liên quan:\n';
      
      // Summarize data to avoid token limits
      if (relevantData.recipes && relevantData.recipes.length > 0) {
        const recipesSummary = relevantData.recipes.slice(0, 5).map(r => ({
          name: r.name,
          short: r.short,
          difficulty: r.difficulty,
          time: r.time,
          ingredients: r.ingredients?.slice(0, 5).map(i => i.name)
        }));
        contextPrompt += JSON.stringify({ recipes: recipesSummary }, null, 2);
      } else {
        contextPrompt += JSON.stringify(relevantData, null, 2);
      }
      
      contextPrompt += '\n\nHãy sử dụng dữ liệu trên để trả lời câu hỏi một cách chính xác.';
    }

    contextPrompt += `\n\n### Câu hỏi của người dùng:\n${userMessage}\n\n### Trả lời (NGẮN GỌN):`;

    try {
      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response:', error);
      
      // Fallback response based on intent
      if (relevantData.recipes && relevantData.recipes.length > 0) {
        const recipeNames = relevantData.recipes.map(r => r.name).join(', ');
        return `Tôi tìm thấy ${relevantData.recipes.length} món ăn cho bạn: ${recipeNames}. Bạn muốn biết chi tiết món nào?`;
      }
      
      return 'Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.';
    }
  }

  // Save conversation to database
  async saveConversation(sessionId, userId, userMessage, assistantMessage, metadata = {}) {
    try {
      let conversation = await Conversation.findOne({ sessionId });

      if (!conversation) {
        conversation = new Conversation({
          sessionId,
          userId,
          messages: []
        });
      }

      conversation.messages.push(
        { role: 'user', content: userMessage, metadata },
        { role: 'assistant', content: assistantMessage }
      );

      conversation.updatedAt = new Date();
      await conversation.save();

      return conversation;
    } catch (error) {
      console.error('Error saving conversation:', error);
      return null;
    }
  }

  // Get conversation history
  async getConversationHistory(sessionId, limit = 10) {
    try {
      const conversation = await Conversation.findOne({ sessionId });
      if (!conversation) return [];

      return conversation.messages.slice(-limit * 2); // Get last N exchanges (user + assistant)
    } catch (error) {
      console.error('Error getting conversation history:', error);
      return [];
    }
  }

  // Main chat method
  async chat(userMessage, sessionId, userId = null) {
    try {
      // Step 1: Analyze intent
      const intentAnalysis = await this.analyzeIntent(userMessage);
      console.log('Intent Analysis:', intentAnalysis);

      // Step 2: Fetch relevant data if needed
      let relevantData = {};
      if (intentAnalysis.needsData) {
        relevantData = await this.fetchRelevantData(intentAnalysis.intent, intentAnalysis.entities);
        console.log('Relevant Data Keys:', Object.keys(relevantData));
      }

      // Step 3: Get conversation history
      const conversationHistory = await this.getConversationHistory(sessionId, 5);

      // Step 4: Generate response
      const assistantMessage = await this.generateResponse(userMessage, relevantData, conversationHistory);

      // Step 5: Save conversation
      await this.saveConversation(sessionId, userId, userMessage, assistantMessage, {
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities
      });

      return {
        success: true,
        message: assistantMessage,
        intent: intentAnalysis.intent,
        data: relevantData
      };
    } catch (error) {
      console.error('Error in chat:', error);
      return {
        success: false,
        message: 'Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.',
        error: error.message
      };
    }
  }

  // Clear conversation history
  async clearConversation(sessionId) {
    try {
      await Conversation.deleteOne({ sessionId });
      return { success: true, message: 'Conversation cleared' };
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChatbotService();
