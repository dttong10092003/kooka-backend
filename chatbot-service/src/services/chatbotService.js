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
  "intent": "search_recipe | get_recipe_details | list_recipes | get_ingredients | get_categories | get_cuisines | recommend_recipe | get_reviews | search_by_difficulty | search_by_criteria | general_question",
  "entities": {
    "recipeName": "tên món ăn nếu có",
    "ingredients": ["danh sách nguyên liệu nếu có"],
    "category": "danh mục nếu có",
    "cuisine": "tên quốc gia/ẩm thực nếu có (VD: Việt Nam, Nhật Bản, Hàn Quốc, Ý, Pháp...)",
    "difficulty": "Dễ | Trung bình | Khó (nếu người dùng hỏi về độ khó)",
    "maxTime": "thời gian tối đa (số phút) nếu có",
    "minTime": "thời gian tối thiểu (số phút) nếu có",
    "maxCalories": "calo tối đa nếu có",
    "minCalories": "calo tối thiểu nếu có",
    "size": "số người ăn nếu có",
    "recipeId": "ID công thức nếu có"
  },
  "needsData": true/false
}

Hướng dẫn phân tích:
- Intent "search_by_difficulty": khi chỉ hỏi về độ khó đơn thuần (món dễ, món khó)
- Intent "search_by_criteria": khi hỏi về thời gian, calo, nguyên liệu, quốc gia, size, hoặc kết hợp nhiều tiêu chí
- Intent "recommend_recipe": khi hỏi gợi ý món ăn theo tiêu chí (món Việt Nam, món Ý...) HOẶC gợi ý chung chung
- Intent "get_cuisines": khi hỏi "có những quốc gia nào", "các món ăn của nước nào"
- Intent "search_recipe": khi tìm kiếm món ăn cụ thể theo tên

Ví dụ:
- "Món nào nấu nhanh dưới 30 phút?" -> search_by_criteria, maxTime: 30
- "Món ăn ít calo" -> search_by_criteria, maxCalories: 300
- "Món Việt Nam" -> recommend_recipe, cuisine: "Việt Nam"
- "Món Ý" -> recommend_recipe, cuisine: "Ý"
- "Món bữa sáng" -> recommend_recipe, category: "Bữa sáng"
- "Món tráng miệng" -> recommend_recipe, category: "Tráng miệng"
- "Món có gà" -> search_by_criteria, ingredients: ["gà"]
- "Món cho 4 người" -> search_by_criteria, size: 4
- "Món Ý dễ làm dưới 45 phút" -> recommend_recipe, cuisine: "Ý", difficulty: "Dễ", maxTime: 45
- "Món bữa sáng dễ làm" -> recommend_recipe, category: "Bữa sáng", difficulty: "Dễ"
- "Món dễ nấu" -> search_by_difficulty, difficulty: "Dễ"
- "Gợi ý món ăn" -> recommend_recipe (không có tiêu chí cụ thể)
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
          // Check if there are specific criteria (cuisine, category, etc.)
          const hasSpecificCriteria = entities.cuisine || entities.category ||
            entities.difficulty || entities.maxTime ||
            entities.ingredients?.length > 0;

          if (hasSpecificCriteria) {
            // Use filter-based search instead of just popular recipes
            const filters = {};

            if (entities.cuisine) filters.cuisine = entities.cuisine;
            if (entities.category) filters.category = entities.category;
            if (entities.difficulty) filters.difficulty = entities.difficulty;
            if (entities.maxTime) filters.maxTime = parseInt(entities.maxTime);
            if (entities.minTime) filters.minTime = parseInt(entities.minTime);
            if (entities.maxCalories) filters.maxCalories = parseInt(entities.maxCalories);
            if (entities.minCalories) filters.minCalories = parseInt(entities.minCalories);
            if (entities.size) filters.size = parseInt(entities.size);
            if (entities.ingredients && entities.ingredients.length > 0) {
              filters.ingredients = entities.ingredients;
            }

            const criteriaResult = await dataFetchService.getRecipesByFilters(filters, 20);
            if (criteriaResult) {
              data.recipes = criteriaResult.recipes;
              data.filters = filters;
            }
          } else {
            // No specific criteria, just get popular recipes
            data.popularRecipes = await dataFetchService.getPopularRecipes(10);
          }
          break;

        case 'get_reviews':
          if (entities.recipeId) {
            data.reviews = await dataFetchService.getReviewsByRecipeId(entities.recipeId);
          }
          break;

        case 'search_by_difficulty':
          if (entities.difficulty) {
            const difficultyResult = await dataFetchService.getRecipesByDifficulty(entities.difficulty, 20);
            if (difficultyResult) {
              data.recipes = difficultyResult.recipes;
            }
          }
          break;

        case 'search_by_criteria':
          // Build filters object from entities
          const filters = {};

          if (entities.cuisine) filters.cuisine = entities.cuisine;
          if (entities.difficulty) filters.difficulty = entities.difficulty;
          if (entities.maxTime) filters.maxTime = parseInt(entities.maxTime);
          if (entities.minTime) filters.minTime = parseInt(entities.minTime);
          if (entities.maxCalories) filters.maxCalories = parseInt(entities.maxCalories);
          if (entities.minCalories) filters.minCalories = parseInt(entities.minCalories);
          if (entities.size) filters.size = parseInt(entities.size);
          if (entities.ingredients && entities.ingredients.length > 0) {
            filters.ingredients = entities.ingredients;
          }

          // Fetch recipes with filters
          const criteriaResult = await dataFetchService.getRecipesByFilters(filters, 20);
          if (criteriaResult) {
            data.recipes = criteriaResult.recipes;
            data.filters = filters; // Include filters in response for debugging
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
        const recipesSummary = relevantData.recipes.slice(0, 8).map(r => ({
          name: r.name,
          short: r.short,
          difficulty: r.difficulty,
          time: r.time,
          calories: r.calories,
          size: r.size,
          cuisine: r.cuisine?.name || null,
          category: r.category?.name || null,
          ingredients: r.ingredients?.slice(0, 5).map(i => i.name)
        }));
        contextPrompt += JSON.stringify({ recipes: recipesSummary }, null, 2);

        // Add filter info if available
        if (relevantData.filters) {
          contextPrompt += '\n\n### Bộ lọc đã áp dụng:\n';
          contextPrompt += JSON.stringify(relevantData.filters, null, 2);
        }
      } else {
        contextPrompt += JSON.stringify(relevantData, null, 2);
      }

      contextPrompt += '\n\nHãy sử dụng dữ liệu trên để trả lời câu hỏi một cách chính xác. Khi giới thiệu món ăn, hãy đề cập đến các thông tin như: thời gian nấu, độ khó, calo, số người ăn (size), quốc gia (cuisine) nếu có.';
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
