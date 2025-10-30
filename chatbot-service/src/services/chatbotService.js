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

  // Analyze image to identify food dish
  async analyzeImage(imageData, userMessage = '') {
    try {
      let base64Image = '';
      let mimeType = 'image/jpeg';

      // Handle different image input formats
      if (typeof imageData === 'string') {
        // Case 1: imageData is a URL (starts with http:// or https://)
        if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
          console.log('Downloading image from URL...');
          const axios = require('axios');
          const imageResponse = await axios.get(imageData, { responseType: 'arraybuffer' });
          base64Image = Buffer.from(imageResponse.data).toString('base64');
          mimeType = imageResponse.headers['content-type'] || 'image/jpeg';
        }
        // Case 2: imageData is already base64 string (with or without data URI prefix)
        else {
          console.log('Using provided base64 image...');
          // Remove data URI prefix if exists (e.g., "data:image/jpeg;base64,")
          if (imageData.includes('base64,')) {
            const parts = imageData.split('base64,');
            base64Image = parts[1];
            // Extract mime type from data URI
            const mimeMatch = parts[0].match(/data:([^;]+);/);
            if (mimeMatch) {
              mimeType = mimeMatch[1];
            }
          } else {
            base64Image = imageData;
          }
        }
      }

      if (!base64Image) {
        console.error('No valid image data provided');
        return null;
      }

      console.log(`Analyzing image (${mimeType})...`);

      const analysisPrompt = `
Phân tích ảnh món ăn này và trả về JSON với format sau (chỉ trả JSON, không có text khác):
{
  "dishName": "tên món ăn tiếng Việt",
  "confidence": "high | medium | low",
  "ingredients": ["danh sách nguyên liệu có thể nhận diện được"],
  "cuisine": "quốc gia/ẩm thực (VD: Việt Nam, Ý, Nhật Bản...)",
  "description": "mô tả ngắn gọn về món ăn"
}

${userMessage ? `Người dùng hỏi: "${userMessage}"` : ''}

Lưu ý: 
- Nếu không chắc chắn là món gì, đặt confidence là "low"
- dishName phải là tên món ăn phổ biến, chuẩn xác
`;

      const result = await this.model.generateContent([
        analysisPrompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log('Image Analysis:', analysis);
        return analysis;
      }

      return null;
    } catch (error) {
      console.error('Error analyzing image:', error.message);
      return null;
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
          // If recipeId is provided, fetch by ID
          if (entities.recipeId) {
            data.recipe = await dataFetchService.getRecipeById(entities.recipeId);
            if (data.recipe) {
              data.reviews = await dataFetchService.getReviewsByRecipeId(entities.recipeId);
              data.comments = await dataFetchService.getCommentsByRecipeId(entities.recipeId);
            }
          } 
          // If recipeName is provided, search by name first
          else if (entities.recipeName) {
            const searchResult = await dataFetchService.searchRecipes(entities.recipeName);
            
            // If found recipes, get the first match's details
            if (searchResult && searchResult.recipes && searchResult.recipes.length > 0) {
              const matchedRecipe = searchResult.recipes[0];
              data.recipe = matchedRecipe;
              
              // Get reviews and comments for this recipe
              if (matchedRecipe._id) {
                data.reviews = await dataFetchService.getReviewsByRecipeId(matchedRecipe._id);
                data.comments = await dataFetchService.getCommentsByRecipeId(matchedRecipe._id);
              }
              
              console.log(`Found recipe in database: ${matchedRecipe.name}`);
            } else {
              // Recipe not found in database
              console.log(`Recipe "${entities.recipeName}" not found in database`);
              data.recipeNotFound = true;
              data.searchedRecipeName = entities.recipeName;
            }
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
  async generateResponse(userMessage, relevantData, conversationHistory = [], imageUrl = null) {
    let contextPrompt = `Bạn là trợ lý ảo thông minh của ứng dụng nấu ăn Kooka. 
Nhiệm vụ của bạn là giúp người dùng tìm kiếm công thức nấu ăn, gợi ý món ăn, trả lời câu hỏi về nấu ăn.

QUAN TRỌNG - Quy tắc trả lời:
- Khi liệt kê NHIỀU món ăn: 
  + Chỉ hiển thị tối đa 6 món phổ biến nhất
  + Format ngắn gọn: "1. 🍜 [Tên món] - ⭐ [rating]/5 - [độ khó] - [thời gian]"
  + Sử dụng emoji đẹp mắt cho món ăn (🍜 🍲 🍛 🥘 🍱 🍣 🍝 🍕 🥗 🍰 🧁 ☕...)
  + KHÔNG mô tả chi tiết, KHÔNG có card
  + Thêm dòng cuối: "Bạn muốn biết chi tiết món nào?"
- Nếu là CHI TIẾT 1 món: Trình bày đầy đủ nguyên liệu, bước làm
- Luôn trả lời thân thiện, nhiệt tình và NGẮN GỌN

`;

    // Add conversation history (only last 2 exchanges to save tokens)
    if (conversationHistory.length > 0) {
      contextPrompt += '\n### Lịch sử hội thoại:\n';
      const recentHistory = conversationHistory.slice(-4); // Last 2 exchanges
      recentHistory.forEach(msg => {
        contextPrompt += `${msg.role === 'user' ? 'Người dùng' : 'Trợ lý'}: ${msg.content}\n`;
      });
    }

    // Add image analysis if available
    if (relevantData.imageAnalysis) {
      contextPrompt += '\n### Phân tích ảnh món ăn:\n';
      contextPrompt += JSON.stringify(relevantData.imageAnalysis, null, 2);
      
      if (relevantData.foundInDatabase === false) {
        contextPrompt += `\n\nMón "${relevantData.searchedDishName}" KHÔNG CÓ trong database của Kooka.\n`;
        contextPrompt += 'Hãy lịch sự thông báo và chia sẻ thông tin về món ăn này dựa trên ảnh và kiến thức của bạn.\n';
      } else if (relevantData.foundInDatabase === true) {
        contextPrompt += `\n\nMón "${relevantData.recipe.name}" CÓ trong database! Hãy sử dụng thông tin chi tiết bên dưới.\n`;
      }
    }

    // Add relevant data if available (summarize if too long)
    if (Object.keys(relevantData).length > 0) {
      contextPrompt += '\n### Dữ liệu liên quan:\n';

      // Handle recipe not found case
      if (relevantData.recipeNotFound) {
        contextPrompt += `\nMón "${relevantData.searchedRecipeName}" KHÔNG CÓ trong database của Kooka.\n`;
        contextPrompt += 'Hãy lịch sự thông báo với người dùng rằng hiện tại ứng dụng chưa có công thức này, ';
        contextPrompt += 'nhưng bạn có thể chia sẻ một số thông tin chung về món ăn này dựa trên kiến thức của bạn (ngắn gọn).\n';
      }
      // Handle single recipe details
      else if (relevantData.recipe) {
        const recipe = relevantData.recipe;
        const recipeDetail = {
          name: recipe.name,
          short: recipe.short,
          difficulty: recipe.difficulty,
          time: recipe.time,
          calories: recipe.calories,
          size: recipe.size,
          cuisine: recipe.cuisine?.name || null,
          category: recipe.category?.name || null,
          ingredients: recipe.ingredients?.map(i => ({
            name: i.name,
            quantity: i.quantity || null
          })) || [],
          instructions: recipe.instructions?.map((inst, idx) => ({
            step: idx + 1,
            title: inst.title,
            subTitle: inst.subTitle
          })) || [],
          video: recipe.video || null,
          rate: recipe.rate || 0,
          numberOfRate: recipe.numberOfRate || 0
        };
        
        contextPrompt += JSON.stringify({ recipe: recipeDetail }, null, 2);
        
        // Add reviews if available
        if (relevantData.reviews && relevantData.reviews.length > 0) {
          contextPrompt += '\n\n### Đánh giá từ người dùng:\n';
          const reviewsSummary = relevantData.reviews.slice(0, 3).map(r => ({
            rating: r.rating,
            comment: r.comment
          }));
          contextPrompt += JSON.stringify({ reviews: reviewsSummary }, null, 2);
        }
        
        contextPrompt += '\n\nHãy trình bày CHI TIẾT công thức này một cách đầy đủ, bao gồm: mô tả, nguyên liệu (với số lượng nếu có), các bước làm, thời gian, độ khó, calo, v.v. Trình bày theo format dễ đọc với emoji phù hợp.';
      }
      // Handle multiple recipes list
      else if (relevantData.recipes && relevantData.recipes.length > 0) {
        const totalRecipes = relevantData.recipes.length;
        
        // Giới hạn chỉ lấy 6 món phổ biến nhất (sort by rating)
        const topRecipes = relevantData.recipes
          .sort((a, b) => (b.rate || 0) - (a.rate || 0))
          .slice(0, 6);
        
        const recipesSummary = topRecipes.map(r => ({
          name: r.name,
          image: r.image,
          rating: r.rate || 0,
          numberOfRatings: r.numberOfRate || 0,
          difficulty: r.difficulty,
          time: r.time
        }));
        
        contextPrompt += JSON.stringify({ 
          totalRecipes: totalRecipes,
          topRecipes: recipesSummary 
        }, null, 2);
        
        contextPrompt += '\n\nHãy trình bày NGẮN GỌN danh sách món ăn. Chỉ hiển thị TÊN MÓN + EMOJI HÌNH ẢNH + RATING + ĐỘ KHÓ + THỜI GIAN.\n';
        contextPrompt += 'Format: "1. 🍜 [Tên món] - ⭐ [rating]/5 ([số đánh giá]) - [độ khó] - [thời gian]"\n';
        contextPrompt += `Chỉ hiển thị ${topRecipes.length} món phổ biến nhất${totalRecipes > 6 ? ` (từ tổng ${totalRecipes} món tìm được)` : ''}.\n`;
        contextPrompt += 'KHÔNG được mô tả chi tiết từng món. Chỉ liệt kê ngắn gọn.';

        // Add filter info if available
        if (relevantData.filters) {
          contextPrompt += '\n\n### Bộ lọc đã áp dụng:\n';
          contextPrompt += JSON.stringify(relevantData.filters, null, 2);
        }
      } else {
        contextPrompt += JSON.stringify(relevantData, null, 2);
      }
    }

    contextPrompt += `\n\n### Câu hỏi của người dùng:\n${userMessage}\n\n### Trả lời (NGẮN GỌN):`;

    try {
      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error('Error generating response:', error);

      // Fallback response based on data
      if (relevantData.recipeNotFound) {
        return `Xin lỗi, hiện tại Kooka chưa có công thức cho món "${relevantData.searchedRecipeName}". Bạn có thể tìm kiếm món khác hoặc hỏi tôi về các món ăn phổ biến khác nhé! 😊`;
      }
      
      if (relevantData.recipe) {
        return `Tôi tìm thấy món ${relevantData.recipe.name}! Đây là một ${relevantData.recipe.short || 'món ăn ngon'}. Bạn muốn biết thêm thông tin gì về món này?`;
      }
      
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
      // Validate that both messages have content
      if (!userMessage || !assistantMessage) {
        console.error('Cannot save conversation: missing content', { 
          hasUserMessage: !!userMessage, 
          hasAssistantMessage: !!assistantMessage 
        });
        return null;
      }

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
  async chat(userMessage, sessionId, userId = null, imageData = null) {
    try {
      let imageAnalysis = null;
      let dishNameFromImage = null;

      // Step 1: Analyze image if provided (can be URL or base64)
      if (imageData) {
        console.log('Image data provided, analyzing...');
        imageAnalysis = await this.analyzeImage(imageData, userMessage);
        
        if (imageAnalysis && imageAnalysis.dishName) {
          dishNameFromImage = imageAnalysis.dishName;
          console.log(`Detected dish from image: ${dishNameFromImage}`);
        }
      }

      // Step 2: Analyze intent (use dish name from image if available)
      const messageToAnalyze = dishNameFromImage 
        ? `${userMessage}. Món ăn trong ảnh: ${dishNameFromImage}`
        : userMessage;
      
      // Run intent analysis and data fetching in parallel for speed
      const [intentAnalysis, conversationHistory] = await Promise.all([
        this.analyzeIntent(messageToAnalyze),
        this.getConversationHistory(sessionId, 5)
      ]);
      
      console.log('Intent Analysis:', intentAnalysis);

      // Step 3: Fetch relevant data if needed
      let relevantData = {};
      
      // If we have dish name from image, try to search for it
      if (dishNameFromImage) {
        const searchResult = await dataFetchService.searchRecipes(dishNameFromImage);
        
        if (searchResult && searchResult.recipes && searchResult.recipes.length > 0) {
          // Found in database
          relevantData.recipe = searchResult.recipes[0];
          relevantData.imageAnalysis = imageAnalysis;
          relevantData.foundInDatabase = true;
          console.log(`Found "${dishNameFromImage}" in database`);
        } else {
          // Not found in database
          relevantData.imageAnalysis = imageAnalysis;
          relevantData.foundInDatabase = false;
          relevantData.searchedDishName = dishNameFromImage;
          console.log(`"${dishNameFromImage}" not found in database`);
        }
      }
      
      // Also fetch data based on intent
      if (intentAnalysis.needsData) {
        const intentData = await this.fetchRelevantData(intentAnalysis.intent, intentAnalysis.entities);
        relevantData = { ...relevantData, ...intentData };
        console.log('Relevant Data Keys:', Object.keys(relevantData));
      }

      // Step 4: Generate response
      const assistantMessage = await this.generateResponse(userMessage, relevantData, conversationHistory, imageData);

      // Step 5: Prepare structured response data
      const structuredData = this.prepareStructuredResponse(relevantData);

      // Step 6: Save conversation (don't wait for it)
      this.saveConversation(sessionId, userId, userMessage, assistantMessage, {
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
        hasImage: !!imageData,
        imageAnalysis: imageAnalysis
      }).catch(err => console.error('Error saving conversation:', err));

      return {
        success: true,
        message: assistantMessage,
        intent: intentAnalysis.intent,
        structuredData: structuredData,
        data: relevantData,
        imageAnalysis: imageAnalysis
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

  // Prepare structured response data for easy rendering
  prepareStructuredResponse(relevantData) {
    const result = {
      recipes: [],
      recipe: null,
      totalCount: 0
    };

    // Single recipe (from image or detail query)
    if (relevantData.recipe) {
      result.recipe = {
        id: relevantData.recipe._id,
        name: relevantData.recipe.name,
        image: relevantData.recipe.image,
        rating: relevantData.recipe.rate || 0,
        numberOfRatings: relevantData.recipe.numberOfRate || 0,
        difficulty: relevantData.recipe.difficulty,
        time: relevantData.recipe.time,
        calories: relevantData.recipe.calories,
        size: relevantData.recipe.size,
        cuisine: relevantData.recipe.cuisine?.name || null,
        category: relevantData.recipe.category?.name || null,
        short: relevantData.recipe.short
      };
    }

    // Multiple recipes - KHÔNG TRẢ VỀ CARDS
    // Chỉ trả về empty array để frontend không render cards
    // Thông tin món ăn sẽ được chatbot hiển thị trong text response
    if (relevantData.recipes && relevantData.recipes.length > 0) {
      result.totalCount = relevantData.recipes.length;
      // Không trả về recipes array để frontend không hiển thị cards
      result.recipes = [];
    }

    return result;
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
