const { getModel } = require("../config/gemini");
const dataFetchService = require("./dataFetchService");
const Conversation = require("../models/Conversation");

class ChatbotService {
  constructor() {
    this.model = getModel();
  }

  // Analyze user intent and extract entities
  async analyzeIntent(userMessage) {
    const intentPrompt = `
Bạn là AI chuyên phân tích ý định người dùng về ẩm thực và dinh dưỡng.

Phân tích câu sau của người dùng:
"${userMessage}"

Trả về JSON với format sau (CHỈ JSON, KHÔNG có text khác):
{
  "intent": "search_recipe | get_recipe_details | list_recipes | get_ingredients | get_categories | get_cuisines | recommend_recipe | get_reviews | search_by_difficulty | search_by_criteria | create_meal_plan | general_question",
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
    "recipeId": "ID công thức nếu có",
    "mealPlanType": "loại meal plan - QUAN TRỌNG: phát hiện từ context",
    "duration": "số ngày meal plan (mặc định 7)",
    "mealPlanCalories": "calo mục tiêu cho meal plan (VD: 1500, 2000)",
    "requiredDishes": ["món BẮT BUỘC phải có (VD: cơm, phở bò, canh)"],
    "excludedDishes": ["món KHÔNG được có (VD: món cay, món nước)"],
    "allergies": ["dị ứng với nguyên liệu (VD: tôm, sữa, đậu phộng)"],
    "avoidIngredients": ["không ăn được (VD: thịt gà, thịt bò)"],
    "nutritionFocus": "trọng tâm dinh dưỡng (VD: protein cao, ít carb, nhiều chất xơ)",
    "dishTypeConstraints": "ràng buộc loại món (VD: phải có cơm mỗi bữa, hạn chế món nước)"
  },
  "needsData": true/false
}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 HƯỚNG DẪN NHẬN DIỆN CÁC INTENT (QUAN TRỌNG):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 CÁC INTENT CHO CÂU HỎI VỀ MÓN ĂN/CÔNG THỨC:

1️⃣ "search_recipe" - Tìm món ăn cụ thể theo TÊN
   ✓ Người dùng nêu TÊN MÓN CỤ THỂ muốn tìm
   ✓ Từ khóa: "món [tên]", "làm [tên món]", "nấu [tên món]"
   📝 Ví dụ:
   • "Món phở bò" → search_recipe, recipeName: "phở bò"
   • "Cách làm bánh xèo" → search_recipe, recipeName: "bánh xèo"
   • "Công thức bún chả" → search_recipe, recipeName: "bún chả"

2️⃣ "search_by_difficulty" - Tìm món theo ĐỘ KHÓ đơn thuần
   ✓ CHỈ HỎI VỀ ĐỘ KHÓ, không có tiêu chí khác
   ✓ Từ khóa: "món dễ", "món khó", "món đơn giản", "món phức tạp"
   📝 Ví dụ:
   • "Món dễ nấu" → search_by_difficulty, difficulty: "Dễ"
   • "Món khó làm" → search_by_difficulty, difficulty: "Khó"
   • "Món đơn giản" → search_by_difficulty, difficulty: "Dễ"

3️⃣ "search_by_criteria" - Tìm món theo TIÊU CHÍ cụ thể
   ✓ Hỏi về: THỜI GIAN, CALO, NGUYÊN LIỆU, SIZE, hoặc KẾT HỢP nhiều tiêu chí
   ✓ KHÔNG phải gợi ý (recommend) mà là TÌM KIẾM với điều kiện rõ ràng
   📝 Ví dụ:
   • "Món nào nấu nhanh dưới 30 phút?" → search_by_criteria, maxTime: 30
   • "Món ăn ít calo" → search_by_criteria, maxCalories: 300
   • "Món có gà" → search_by_criteria, ingredients: ["gà"]
   • "Món cho 4 người" → search_by_criteria, size: 4
   • "Món dưới 500 calo, có tôm" → search_by_criteria, maxCalories: 500, ingredients: ["tôm"]

4️⃣ "recommend_recipe" - GỢI Ý món ăn theo TIÊU CHÍ hoặc CHUNG CHUNG
   ✓ Hỏi GỢI Ý món ăn theo QUỐC GIA, DANH MỤC (bữa sáng, tráng miệng...)
   ✓ Hỏi gợi ý CHUNG CHUNG (không tiêu chí cụ thể)
   ✓ Có thể KẾT HỢP với độ khó, thời gian
   📝 Ví dụ:
   • "Món Việt Nam" → recommend_recipe, cuisine: "Việt Nam"
   • "Món Ý" → recommend_recipe, cuisine: "Ý"
   • "Món bữa sáng" → recommend_recipe, category: "Bữa sáng"
   • "Món tráng miệng" → recommend_recipe, category: "Tráng miệng"
   • "Gợi ý món ăn" → recommend_recipe (không tiêu chí cụ thể)
   • "Món Ý dễ làm dưới 45 phút" → recommend_recipe, cuisine: "Ý", difficulty: "Dễ", maxTime: 45
   • "Món bữa sáng dễ làm" → recommend_recipe, category: "Bữa sáng", difficulty: "Dễ"

5️⃣ "get_cuisines" - Hỏi về DANH SÁCH QUỐC GIA/ẨM THỰC
   ✓ Hỏi "có những quốc gia nào", "các món ăn của nước nào"
   📝 Ví dụ:
   • "Có những quốc gia nào?" → get_cuisines
   • "Món ăn của những nước nào?" → get_cuisines

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 HƯỚNG DẪN NHẬN DIỆN MEAL PLAN (CHỈ CHO KẾ HOẠCH BỮA ĂN):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Intent = "create_meal_plan" KHI NGƯỜI DÙNG:
✓ Yêu cầu tạo MEAL PLAN / KẾ HOẠCH ĂN / THỰC ĐƠN / PLAN BỮA ĂN
✓ Nói về CHẾ ĐỘ ĂN UỐNG / LỊCH TRÌNH ĂN / MENU TUẦN
✓ Hỏi "ăn gì trong X ngày" / "món ăn cho cả tuần" / "bữa sáng/trưa/tối"
✓ Đề cập MỤC ĐÍCH CỤ THỂ: văn phòng, ăn kiêng, tập gym, giảm cân, tăng cơ...

📝 CÁC TỪ KHÓA MEAL PLAN (nhận diện tự động):
• "meal plan", "kế hoạch", "thực đơn", "menu", "lịch ăn", "plan", "schedule"
• "ăn gì", "nấu gì", "bữa ăn", "bữa sáng", "bữa trưa", "bữa tối"
• "1 tuần", "7 ngày", "cả tuần", "tuần này", "hàng ngày"

🎭 CÁC LOẠI MEAL PLAN TYPE (mealPlanType):

1. "văn phòng" - Dân văn phòng, công sở, nhân viên
   Từ khóa: văn phòng, công sở, nhân viên, làm việc, bận rộn vừa phải

2. "ăn kiêng" / "giảm cân" - Giảm cân, ăn kiêng, healthy
   Từ khóa: giảm cân, ăn kiêng, diet, healthy, gầy, béo, ít calo, detox

3. "ăn chay" - Người ăn chay hoàn toàn
   Từ khóa: ăn chay, chay, vegetarian, vegan, không thịt, không cá

4. "tăng cân" - Tăng cân lành mạnh
   Từ khóa: tăng cân, béo lên, gầy quá, tăng ký, cần tăng cân

5. "tiểu đường" - Bệnh tiểu đường, đường huyết
   Từ khóa: tiểu đường, đái tháo đường, đường huyết, diabetes, ít đường

6. "người bận rộn" - Cực kỳ bận rộn, không có thời gian
   Từ khóa: bận rộn, không có thời gian, nhanh gọn, siêu nhanh, tối giản

7. "người già" - Người cao tuổi, người lớn tuổi
   Từ khóa: người già, cao tuổi, tuổi lớn, ông bà, phụ huynh, dễ nhai, mềm

8. "thể hình" / "gym" - Tập gym, thể hình, tăng cơ
   Từ khóa: gym, thể hình, tập luyện, tăng cơ, bodybuilding, fitness, workout

9. "mang thai" - Phụ nữ mang thai
   Từ khóa: mang thai, bầu bí, thai kỳ, mẹ bầu, thai sản

10. "trẻ em" - Trẻ em, trẻ nhỏ
    Từ khóa: trẻ em, trẻ nhỏ, con nhỏ, bé, em bé, học sinh tiểu học

11. "học sinh" - Học sinh, sinh viên
    Từ khóa: học sinh, sinh viên, học đường, đi học, tiết kiệm

12. "cao cấp" - Dân văn phòng cao cấp, organic
    Từ khóa: cao cấp, organic, sang trọng, healthy cao cấp, chất lượng cao

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📚 TÓM TẮT VÍ DỤ NHẬN DIỆN:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ MEAL PLAN (intent = create_meal_plan):
• "Tạo meal plan cho người văn phòng" → create_meal_plan, mealPlanType: "văn phòng"
• "Lên kế hoạch ăn kiêng 1 tuần" → create_meal_plan, mealPlanType: "ăn kiêng", duration: 7
• "Plan bữa ăn cho người ăn chay" → create_meal_plan, mealPlanType: "ăn chay"
• "Thực đơn cho người tập gym 5 ngày" → create_meal_plan, mealPlanType: "thể hình", duration: 5
• "Menu cho người bận rộn cả tuần" → create_meal_plan, mealPlanType: "người bận rộn", duration: 7
• "Thực đơn giảm cân" → create_meal_plan, mealPlanType: "ăn kiêng"
• "Kế hoạch ăn uống cho người già" → create_meal_plan, mealPlanType: "người già"

✅ TÌM MÓN CỤ THỂ (intent = search_recipe):
• "Món phở bò" → search_recipe, recipeName: "phở bò"
• "Cách làm bánh xèo" → search_recipe, recipeName: "bánh xèo"

✅ TÌM THEO ĐỘ KHÓ (intent = search_by_difficulty):
• "Món dễ nấu" → search_by_difficulty, difficulty: "Dễ"
• "Món khó làm" → search_by_difficulty, difficulty: "Khó"

✅ TÌM THEO TIÊU CHÍ (intent = search_by_criteria):
• "Món nào nấu nhanh dưới 30 phút?" → search_by_criteria, maxTime: 30
• "Món ăn ít calo" → search_by_criteria, maxCalories: 300
• "Món có gà" → search_by_criteria, ingredients: ["gà"]
• "Món cho 4 người" → search_by_criteria, size: 4

✅ GỢI Ý MÓN ĂN (intent = recommend_recipe):
• "Món Việt Nam" → recommend_recipe, cuisine: "Việt Nam"
• "Món bữa sáng" → recommend_recipe, category: "Bữa sáng"
• "Món tráng miệng" → recommend_recipe, category: "Tráng miệng"
• "Gợi ý món ăn" → recommend_recipe (không tiêu chí)
• "Món Ý dễ làm" → recommend_recipe, cuisine: "Ý", difficulty: "Dễ"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ LƯU Ý:
- Nếu KHÔNG rõ meal plan type → mặc định "văn phòng"
- Nếu KHÔNG có duration → mặc định 7 ngày
- Phân biệt: "món bữa sáng" (recommend_recipe) ≠ "meal plan bữa sáng" (create_meal_plan)
- Ưu tiên "create_meal_plan" nếu có từ khóa "kế hoạch", "thực đơn", "plan", "X ngày"
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

      return { intent: "general_question", entities: {}, needsData: false };
    } catch (error) {
      console.error("Error analyzing intent:", error);
      return { intent: "general_question", entities: {}, needsData: false };
    }
  }

  // Analyze image to identify food dish
  async analyzeImage(imageData, userMessage = "") {
    try {
      let base64Image = "";
      let mimeType = "image/jpeg";

      // Handle different image input formats
      if (typeof imageData === "string") {
        // Case 1: imageData is a URL (starts with http:// or https://)
        if (
          imageData.startsWith("http://") ||
          imageData.startsWith("https://")
        ) {
          console.log("Downloading image from URL...");
          const axios = require("axios");
          const imageResponse = await axios.get(imageData, {
            responseType: "arraybuffer",
          });
          base64Image = Buffer.from(imageResponse.data).toString("base64");
          mimeType = imageResponse.headers["content-type"] || "image/jpeg";
        }
        // Case 2: imageData is already base64 string (with or without data URI prefix)
        else {
          console.log("Using provided base64 image...");
          // Remove data URI prefix if exists (e.g., "data:image/jpeg;base64,")
          if (imageData.includes("base64,")) {
            const parts = imageData.split("base64,");
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
        console.error("No valid image data provided");
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

${userMessage ? `Người dùng hỏi: "${userMessage}"` : ""}

Lưu ý: 
- Nếu không chắc chắn là món gì, đặt confidence là "low"
- dishName phải là tên món ăn phổ biến, chuẩn xác
`;

      const result = await this.model.generateContent([
        analysisPrompt,
        {
          inlineData: {
            mimeType: mimeType,
            data: base64Image,
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        console.log("Image Analysis:", analysis);
        return analysis;
      }

      return null;
    } catch (error) {
      console.error("Error analyzing image:", error.message);
      return null;
    }
  }

  // Fetch relevant data based on intent
  async fetchRelevantData(intent, entities) {
    let data = {};

    try {
      switch (intent) {
        case "search_recipe":
          if (entities.recipeName) {
            data.recipes = await dataFetchService.searchRecipes(
              entities.recipeName
            );
          } else if (entities.ingredients && entities.ingredients.length > 0) {
            data.recipes = await dataFetchService.getRecipesByIngredients(
              entities.ingredients
            );
          }
          break;

        case "get_recipe_details":
          // If recipeId is provided, fetch by ID
          if (entities.recipeId) {
            data.recipe = await dataFetchService.getRecipeById(
              entities.recipeId
            );
            if (data.recipe) {
              data.reviews = await dataFetchService.getReviewsByRecipeId(
                entities.recipeId
              );
              data.comments = await dataFetchService.getCommentsByRecipeId(
                entities.recipeId
              );
            }
          }
          // If recipeName is provided, search by name first
          else if (entities.recipeName) {
            const searchResult = await dataFetchService.searchRecipes(
              entities.recipeName
            );

            // If found recipes, get the first match's details
            if (
              searchResult &&
              searchResult.recipes &&
              searchResult.recipes.length > 0
            ) {
              const matchedRecipe = searchResult.recipes[0];
              
              // 🔴 QUAN TRỌNG: Phải fetch FULL recipe details bằng ID để có đầy đủ instructions
              if (matchedRecipe._id) {
                console.log(`🔍 Found recipe "${matchedRecipe.name}", fetching full details...`);
                const fullRecipe = await dataFetchService.getRecipeById(
                  matchedRecipe._id
                );
                
                if (fullRecipe) {
                  data.recipe = fullRecipe;
                  console.log(`✅ Full recipe loaded with ${fullRecipe.instructions?.length || 0} instruction steps`);
                } else {
                  // Fallback to search result if getById fails
                  data.recipe = matchedRecipe;
                  console.log(`⚠️ Fallback to search result (may miss instructions)`);
                }

                // Get reviews and comments for this recipe
                data.reviews = await dataFetchService.getReviewsByRecipeId(
                  matchedRecipe._id
                );
                data.comments = await dataFetchService.getCommentsByRecipeId(
                  matchedRecipe._id
                );
              } else {
                data.recipe = matchedRecipe;
              }

              console.log(`Found recipe in database: ${matchedRecipe.name}`);
            } else {
              // Recipe not found in database
              console.log(
                `Recipe "${entities.recipeName}" not found in database`
              );
              data.recipeNotFound = true;
              data.searchedRecipeName = entities.recipeName;
            }
          }
          break;

        case "list_recipes":
          data.recipes = await dataFetchService.getRecipes(20);
          break;

        case "get_ingredients":
          data.ingredients = await dataFetchService.getIngredients();
          break;

        case "get_categories":
          data.categories = await dataFetchService.getCategories();
          break;

        case "get_cuisines":
          data.cuisines = await dataFetchService.getCuisines();
          break;

        case "recommend_recipe":
          // Check if there are specific criteria (cuisine, category, etc.)
          const hasSpecificCriteria =
            entities.cuisine ||
            entities.category ||
            entities.difficulty ||
            entities.maxTime ||
            entities.ingredients?.length > 0;

          if (hasSpecificCriteria) {
            // Use filter-based search instead of just popular recipes
            const filters = {};

            if (entities.cuisine) filters.cuisine = entities.cuisine;
            if (entities.category) filters.category = entities.category;
            if (entities.difficulty) filters.difficulty = entities.difficulty;
            if (entities.maxTime) filters.maxTime = parseInt(entities.maxTime);
            if (entities.minTime) filters.minTime = parseInt(entities.minTime);
            if (entities.maxCalories)
              filters.maxCalories = parseInt(entities.maxCalories);
            if (entities.minCalories)
              filters.minCalories = parseInt(entities.minCalories);
            if (entities.size) filters.size = parseInt(entities.size);
            if (entities.ingredients && entities.ingredients.length > 0) {
              filters.ingredients = entities.ingredients;
            }

            const criteriaResult = await dataFetchService.getRecipesByFilters(
              filters,
              20
            );
            if (criteriaResult) {
              data.recipes = criteriaResult.recipes;
              data.filters = filters;
            }
          } else {
            // No specific criteria, just get popular recipes
            data.popularRecipes = await dataFetchService.getPopularRecipes(10);
          }
          break;

        case "get_reviews":
          if (entities.recipeId) {
            data.reviews = await dataFetchService.getReviewsByRecipeId(
              entities.recipeId
            );
          }
          break;

        case "search_by_difficulty":
          if (entities.difficulty) {
            const difficultyResult =
              await dataFetchService.getRecipesByDifficulty(
                entities.difficulty,
                20
              );
            if (difficultyResult) {
              data.recipes = difficultyResult.recipes;
            }
          }
          break;

        case "search_by_criteria":
          // Build filters object from entities
          const filters = {};

          if (entities.cuisine) filters.cuisine = entities.cuisine;
          if (entities.difficulty) filters.difficulty = entities.difficulty;
          if (entities.maxTime) filters.maxTime = parseInt(entities.maxTime);
          if (entities.minTime) filters.minTime = parseInt(entities.minTime);
          if (entities.maxCalories)
            filters.maxCalories = parseInt(entities.maxCalories);
          if (entities.minCalories)
            filters.minCalories = parseInt(entities.minCalories);
          if (entities.size) filters.size = parseInt(entities.size);
          if (entities.ingredients && entities.ingredients.length > 0) {
            filters.ingredients = entities.ingredients;
          }

          // Fetch recipes with filters
          const criteriaResult = await dataFetchService.getRecipesByFilters(
            filters,
            20
          );
          if (criteriaResult) {
            data.recipes = criteriaResult.recipes;
            data.filters = filters; // Include filters in response for debugging
          }
          break;

        case "create_meal_plan":
          if (entities.mealPlanType) {
            console.log("🍽️ Generating meal plan for:", entities.mealPlanType);
            const mealPlanData = await this.generateMealPlan(entities);
            data.generatedMealPlan = mealPlanData;
          }
          break;

        default:
          // No specific data needed
          break;
      }
    } catch (error) {
      console.error("Error fetching relevant data:", error);
    }

    return data;
  }

  // 🆕 Generate INTELLIGENT AI meal plan (breakfast/lunch/dinner specific)
  async generateMealPlan(entities) {
    const { 
      mealPlanType, 
      duration = 7,
      mealPlanCalories,
      requiredDishes = [],
      excludedDishes = [],
      allergies = [],
      avoidIngredients = [],
      nutritionFocus,
      dishTypeConstraints
    } = entities;

    console.log(
      `📋 Creating INTELLIGENT meal plan: ${mealPlanType} for ${duration} days`
    );
    console.log(`🎯 Special requirements:`, {
      calories: mealPlanCalories,
      requiredDishes,
      excludedDishes,
      allergies,
      avoidIngredients,
      nutritionFocus,
      dishTypeConstraints
    });

    // Step 1: Get meal-time specific criteria
    const mealCriteria = this.getMealPlanCriteria(mealPlanType, entities);
    console.log(
      "🔍 Meal-time specific criteria:",
      JSON.stringify(mealCriteria, null, 2)
    );

    // Step 2: Fetch recipes for EACH meal time (breakfast/lunch/dinner) separately
    const breakfastRecipes = await this.fetchRecipesForMeal(
      "breakfast",
      mealCriteria.breakfast,
      mealPlanType,
      entities
    );
    const lunchRecipes = await this.fetchRecipesForMeal(
      "lunch",
      mealCriteria.lunch,
      mealPlanType,
      entities
    );
    const dinnerRecipes = await this.fetchRecipesForMeal(
      "dinner",
      mealCriteria.dinner,
      mealPlanType,
      entities
    );

    console.log(
      `✅ Fetched: ${breakfastRecipes.length} breakfast, ${lunchRecipes.length} lunch, ${dinnerRecipes.length} dinner recipes`
    );

    // Step 3: Use AI to select best recipes for each meal time
    // 🎯 ĐA DẠNG TỐI ĐA: Tránh trùng món giữa các bữa ăn
    const allUsedRecipeIds = []; // Track ALL recipes used across all meals

    // 🌅 Select breakfast recipes
    const selectedBreakfast = await this.selectRecipesWithAI(
      breakfastRecipes,
      `${mealPlanType} - Bữa sáng`,
      duration,
      allUsedRecipeIds,
      entities
    );
    allUsedRecipeIds.push(...selectedBreakfast.map(r => r._id.toString()));

    // 🌞 Select lunch recipes (avoid breakfast recipes)
    const selectedLunch = await this.selectRecipesWithAI(
      lunchRecipes,
      `${mealPlanType} - Bữa trưa`,
      duration,
      allUsedRecipeIds,
      entities
    );
    allUsedRecipeIds.push(...selectedLunch.map(r => r._id.toString()));

    // 🌙 Select dinner recipes (avoid breakfast + lunch recipes)
    const selectedDinner = await this.selectRecipesWithAI(
      dinnerRecipes,
      `${mealPlanType} - Bữa tối`,
      duration,
      allUsedRecipeIds,
      entities
    );

    console.log(
      `🎯 AI selected: ${selectedBreakfast.length} breakfast, ${selectedLunch.length} lunch, ${selectedDinner.length} dinner (Total unique: ${new Set([...selectedBreakfast.map(r => r._id.toString()), ...selectedLunch.map(r => r._id.toString()), ...selectedDinner.map(r => r._id.toString())]).size}/${selectedBreakfast.length + selectedLunch.length + selectedDinner.length})`
    );

    // Step 4: Create intelligent 7-day meal plan structure (meal-time specific)
    const mealPlan = this.createIntelligentMealPlanStructure(
      selectedBreakfast,
      selectedLunch,
      selectedDinner,
      duration
    );

    return {
      success: true,
      mealPlanType,
      duration,
      mealPlan,
      totalRecipes:
        selectedBreakfast.length + selectedLunch.length + selectedDinner.length,
      breakdown: {
        breakfast: selectedBreakfast.length,
        lunch: selectedLunch.length,
        dinner: selectedDinner.length,
      },
    };
  }

  // 🆕 Fetch recipes for specific meal time with intelligent filtering
  async fetchRecipesForMeal(mealTime, criteria, mealPlanType, entities = {}) {
    console.log(`🍽️ Fetching recipes for ${mealTime} with criteria:`, criteria);

    const {
      requiredDishes = [],
      excludedDishes = [],
      allergies = [],
      avoidIngredients = [],
      dishTypeConstraints
    } = entities;

    // Build basic filters (calories, time, difficulty)
    const filters = {};
    if (criteria.maxCalories) filters.maxCalories = criteria.maxCalories;
    if (criteria.minCalories) filters.minCalories = criteria.minCalories;
    if (criteria.maxTime) filters.maxTime = criteria.maxTime;
    if (criteria.difficulty) filters.difficulty = criteria.difficulty;

    // Fetch initial recipes based on basic filters
    const recipesResult = await dataFetchService.getRecipesByFilters(
      filters,
      200
    );

    if (
      !recipesResult ||
      !recipesResult.recipes ||
      recipesResult.recipes.length === 0
    ) {
      console.log(`⚠️ No recipes found for ${mealTime} with basic filters`);
      return [];
    }

    console.log(
      `📦 Found ${recipesResult.recipes.length} recipes, now filtering by category/tags/ingredients...`
    );

    // ⚠️ ĐẶC BIỆT: Kiểm tra meal plan type có yêu cầu STRICT không
    const isVegetarianStrict = mealPlanType.toLowerCase().includes('ăn chay') || 
                                mealPlanType.toLowerCase() === 'chay';

    // Merge all avoid ingredients (from criteria + entities)
    const allAvoidIngredients = [
      ...(criteria.avoidIngredients || []),
      ...allergies,
      ...avoidIngredients
    ];

    // Advanced filtering: category, tags, ingredients, constraints
    let filteredRecipes = recipesResult.recipes.filter((recipe) => {
      const recipeName = (recipe.name || "").toLowerCase();
      
      // 🚫 1. BẮT BUỘC: Kiểm tra món bị loại trừ (excluded dishes)
      if (excludedDishes.length > 0) {
        const isExcluded = excludedDishes.some(excluded => 
          recipeName.includes(excluded.toLowerCase()) ||
          excluded.toLowerCase().includes(recipeName)
        );
        if (isExcluded) {
          console.log(`❌ Excluded dish: ${recipe.name}`);
          return false;
        }
      }

      // 🚫 2. Kiểm tra dish type constraints (VD: "không có cơm", "hạn chế món nước", "hạn chế món cay")
      if (dishTypeConstraints) {
        const constraints = dishTypeConstraints.toLowerCase();
        
        // Không có cơm
        if (constraints.includes('không có cơm') || constraints.includes('không cơm')) {
          if (recipeName.includes('cơm')) {
            console.log(`❌ Excluded (no rice): ${recipe.name}`);
            return false;
          }
        }
        
        // Hạn chế món nước
        if (constraints.includes('hạn chế món nước') || constraints.includes('ít món nước')) {
          const recipeTags = recipe.tags?.map(
            (tag) => tag.nameLowercase || tag.name?.toLowerCase() || ""
          ) || [];
          if (recipeTags.some(tag => tag.includes('món nước'))) {
            // Chỉ cho 1/3 món nước qua (ngẫu nhiên)
            if (Math.random() > 0.33) {
              console.log(`❌ Limited soup dish: ${recipe.name}`);
              return false;
            }
          }
        }
        
        // Hạn chế món cay
        if (constraints.includes('hạn chế món cay') || constraints.includes('ít món cay') || 
            constraints.includes('không cay')) {
          const recipeTags = recipe.tags?.map(
            (tag) => tag.nameLowercase || tag.name?.toLowerCase() || ""
          ) || [];
          if (recipeTags.some(tag => tag.includes('cay')) || recipeName.includes('cay')) {
            console.log(`❌ Excluded spicy dish: ${recipe.name}`);
            return false;
          }
        }
      }

      // 🚫 3. BẮT BUỘC: Nếu là meal plan "ăn chay" → CHỈ LẤY MÓN CHAY
      if (isVegetarianStrict) {
        const recipeTags = recipe.tags?.map(
          (tag) => tag.nameLowercase || tag.name?.toLowerCase() || ""
        ) || [];
        
        // Kiểm tra xem có tag "chay" không
        const isVegetarian = recipeTags.some(tag => 
          tag.includes('chay') || 
          tag.includes('vegetarian') || 
          tag.includes('vegan')
        );
        
        // Kiểm tra xem có nguyên liệu KHÔNG CHAY không
        const recipeIngredients = recipe.ingredients?.map(
          (ing) => ing.nameLowercase || ing.name?.toLowerCase() || ""
        ) || [];
        
        const hasNonVegetarian = recipeIngredients.some(ing =>
          ing.includes('thịt') || ing.includes('heo') || ing.includes('bò') ||
          ing.includes('gà') || ing.includes('vịt') || ing.includes('cá') ||
          ing.includes('tôm') || ing.includes('mực') || ing.includes('hải sản') ||
          ing.includes('trứng') || ing.includes('sữa bò')
        );
        
        // Nếu KHÔNG có tag chay HOẶC có nguyên liệu không chay → LOẠI BỎ
        if (!isVegetarian || hasNonVegetarian) {
          return false;
        }
      }

      let score = 0;

      // 4. Check CATEGORY (priority: exact match)
      if (criteria.categories && criteria.categories.length > 0) {
        const recipeCategoryLower =
          recipe.category?.nameLowercase ||
          recipe.category?.name?.toLowerCase() ||
          "";
        const matchesCategory = criteria.categories.some(
          (cat) =>
            recipeCategoryLower.includes(cat.toLowerCase()) ||
            cat.toLowerCase().includes(recipeCategoryLower)
        );
        if (matchesCategory) score += 100;
      }

      // 5. Check TAGS (bonus points)
      if (criteria.tags && criteria.tags.length > 0 && recipe.tags) {
        const recipeTags = recipe.tags.map(
          (tag) => tag.nameLowercase || tag.name?.toLowerCase() || ""
        );
        criteria.tags.forEach((criteriaTag) => {
          if (
            recipeTags.some((recipeTag) =>
              recipeTag.includes(criteriaTag.toLowerCase())
            )
          ) {
            score += 20;
          }
        });
      }

      // 6. Check PREFERRED INGREDIENTS (bonus points)
      if (
        criteria.preferredIngredients &&
        criteria.preferredIngredients.length > 0 &&
        recipe.ingredients
      ) {
        const recipeIngredients = recipe.ingredients.map(
          (ing) => ing.nameLowercase || ing.name?.toLowerCase() || ""
        );
        criteria.preferredIngredients.forEach((prefIng) => {
          if (
            recipeIngredients.some((recipeIng) =>
              recipeIng.includes(prefIng.toLowerCase())
            )
          ) {
            score += 10;
          }
        });
      }

      // 7. Check AVOID INGREDIENTS (penalty/filter out - includes allergies)
      if (allAvoidIngredients.length > 0 && recipe.ingredients) {
        const recipeIngredients = recipe.ingredients.map(
          (ing) => ing.nameLowercase || ing.name?.toLowerCase() || ""
        );
        const hasAvoidedIngredient = allAvoidIngredients.some(
          (avoidIng) =>
            recipeIngredients.some((recipeIng) =>
              recipeIng.includes(avoidIng.toLowerCase())
            )
        );
        if (hasAvoidedIngredient) {
          console.log(`❌ Excluded (allergy/avoid): ${recipe.name} - contains ${allAvoidIngredients.join(', ')}`);
          return false; // Filter out recipes with avoided ingredients
        }
      }

      // Accept recipes with score > 0 (matched category/tags/ingredients)
      // OR if no specific criteria (fallback)
      return score > 0 || (!criteria.categories && !criteria.tags);
    });

    // 🎯 8. Handle required dishes - Tìm món bắt buộc phải có
    let requiredRecipes = [];
    if (requiredDishes.length > 0) {
      console.log(`🔍 Searching for required dishes:`, requiredDishes);
      
      requiredRecipes = filteredRecipes.filter(recipe => {
        const recipeName = (recipe.name || "").toLowerCase();
        return requiredDishes.some(required => 
          recipeName.includes(required.toLowerCase()) ||
          required.toLowerCase().includes(recipeName)
        );
      });
      
      console.log(`✅ Found ${requiredRecipes.length} required dishes:`, requiredRecipes.map(r => r.name));
      
      // Remove required recipes from filtered list to avoid duplication
      const requiredIds = new Set(requiredRecipes.map(r => r._id.toString()));
      filteredRecipes = filteredRecipes.filter(r => !requiredIds.has(r._id.toString()));
    }

    // Sort by rating (prefer high-rated recipes)
    filteredRecipes.sort((a, b) => {
      const rateA = a.rate || 0;
      const rateB = b.rate || 0;
      return rateB - rateA;
    });

    // Merge required recipes at the beginning (they get priority)
    const finalRecipes = [...requiredRecipes, ...filteredRecipes];

    console.log(
      `✅ Filtered to ${finalRecipes.length} recipes for ${mealTime} ${isVegetarianStrict ? '(CHAY ONLY)' : ''} (${requiredRecipes.length} required + ${filteredRecipes.length} others)`
    );
    return finalRecipes;
  }

  // Get INTELLIGENT meal-specific criteria based on meal plan type and meal time
  // ✅ ENHANCED VERSION: Thêm nhiều tags + criteria để AI chọn món chính xác hơn
  // ✅ UPDATED: Nhận entities để điều chỉnh theo yêu cầu cụ thể
  getMealPlanCriteria(mealPlanType, entities = {}) {
    const normalized = mealPlanType.toLowerCase();

    // Extract special requirements from entities
    const {
      mealPlanCalories,
      requiredDishes = [],
      excludedDishes = [],
      allergies = [],
      avoidIngredients = [],
      nutritionFocus,
      dishTypeConstraints
    } = entities;

    // 🎯 Define meal-time specific criteria for each user goal
    //
    // Categories (Loại bữa ăn - có trong DB):
    //   - Bữa sáng, Bữa trưa, Bữa tối, Bữa chính, Bữa phụ, Tráng miệng
    //
    // Tags (Đặc điểm món ăn - EXPANDED với nhiều tags hơn):
    //   - Dinh dưỡng: Protein cao, Chất xơ, Vitamin, Omega-3, Canxi, Sắt
    //   - Mục đích: Giảm cân, Tăng cân, Tăng cơ, Gym, Healthy, Detox
    //   - Cảm giác: Nhẹ nhàng, Mềm, Giòn, Béo ngậy, Thanh mát
    //   - Độ khó: Nhanh, Dễ làm, Đơn giản, Phức tạp
    //   - Tiêu hóa: Dễ tiêu, Dễ hấp thu, Không gây đầy hơi
    //   - Sức khỏe: Ít calo, Ít đường, Ít muối, Ít dầu mỡ, Low carb, Keto
    //   - Vị: Món cay, Món nước, Món ngọt, Món mặn, Món chua, Món đắng
    //   - Loại: Món chay, Món mặn, Đường phố, Truyền thống, Hiện đại
    //   - Đặc biệt: Cho trẻ em, Cho phụ nữ mang thai, Cho người bệnh
    const criteriaMap = {
      // 👔 Người văn phòng: Nhanh, tiện, đủ năng lượng làm việc
      "văn phòng": {
        breakfast: {
          maxTime: 20,
          difficulty: "Dễ",
          maxCalories: 400,
          categories: ["Bữa sáng"],
          tags: [
            "Nhanh",
            "Dễ làm",
            "Đơn giản",
            "Ít calo",
            "Nhẹ nhàng",
            "Protein cao",
            "Dễ hấp thu",
          ],
          preferredIngredients: [
            "trứng",
            "bánh mì",
            "yến mạch",
            "sữa",
            "chuối",
            "bơ",
          ],
          avoidIngredients: ["dầu mỡ nhiều"],
          description: "Bữa sáng nhanh gọn, đủ năng lượng để làm việc hiệu quả",
        },
        lunch: {
          maxTime: 45,
          maxCalories: 650,
          categories: ["Bữa chính", "Bữa trưa"],
          tags: ["Món mặn", "Dinh dưỡng", "Protein cao", "Chất xơ", "Vitamin"],
          preferredIngredients: [
            "thịt",
            "cá",
            "rau xanh",
            "gạo lứt",
            "đậu",
            "nấm",
          ],
          avoidIngredients: ["đồ chiên nhiều"],
          description:
            "Bữa trưa đầy đủ chất, giúp tập trung làm việc buổi chiều",
        },
        dinner: {
          maxTime: 30,
          difficulty: "Dễ",
          maxCalories: 500,
          categories: ["Bữa tối", "Bữa phụ"],
          tags: [
            "Ít calo",
            "Nhẹ nhàng",
            "Dễ tiêu",
            "Món nước",
            "Thanh mát",
            "Low carb",
          ],
          preferredIngredients: ["rau", "cá", "tôm", "thịt gà", "đậu phụ"],
          avoidIngredients: ["thịt heo", "thịt bò", "cơm nhiều"],
          description: "Bữa tối nhẹ nhàng, dễ tiêu để ngủ ngon",
        },
      },
      // 🥗 Ăn kiêng/Giảm cân: Ít calo, nhiều chất xơ, no lâu
      "ăn kiêng": {
        breakfast: {
          maxTime: 20,
          maxCalories: 300,
          difficulty: "Dễ",
          categories: ["Bữa sáng"],
          tags: [
            "Ít calo",
            "Giảm cân",
            "Healthy",
            "Nhẹ nhàng",
            "Chất xơ",
            "Ít đường",
            "Detox",
          ],
          preferredIngredients: [
            "yến mạch",
            "trứng",
            "rau xanh",
            "sữa tách béo",
            "táo",
            "bưởi",
          ],
          avoidIngredients: ["dầu ăn", "đường", "bơ", "bánh ngọt", "gạo trắng"],
          description: "Bữa sáng ít calo nhưng no lâu, hỗ trợ giảm cân",
        },
        lunch: {
          maxCalories: 400,
          categories: ["Bữa trưa", "Bữa phụ"],
          tags: [
            "Ít calo",
            "Giảm cán",
            "Healthy",
            "Chất xơ",
            "Low carb",
            "Protein cao",
            "Món nước",
          ],
          preferredIngredients: [
            "rau củ",
            "cá lóc",
            "ức gà",
            "đậu phụ",
            "nấm",
            "canh",
          ],
          avoidIngredients: [
            "thịt heo",
            "thịt bò",
            "dầu mỡ",
            "cơm trắng",
            "bún phở",
          ],
          description: "Bữa trưa đủ chất nhưng ít calo, no bụng không lo béo",
        },
        dinner: {
          maxCalories: 300,
          categories: ["Bữa tối", "Bữa phụ"],
          tags: [
            "Ít calo",
            "Nhẹ nhàng",
            "Dễ tiêu",
            "Món nước",
            "Thanh mát",
            "Detox",
            "Chất xơ",
          ],
          preferredIngredients: ["rau xanh", "tôm", "cá", "canh rau", "súp"],
          avoidIngredients: ["thịt", "dầu mỡ", "tinh bột", "cơm", "mì"],
          description: "Bữa tối rất nhẹ, chỉ rau và protein, giảm cân hiệu quả",
        },
      },
      // 🌱 Ăn chay: Hoàn toàn thực vật, đủ protein, đa dạng
      "ăn chay": {
        breakfast: {
          maxTime: 20,
          categories: ["Bữa sáng"],
          tags: [
            "Món chay",
            "Healthy",
            "Nhẹ nhàng",
            "Protein cao",
            "Chất xơ",
            "Vitamin",
          ],
          preferredIngredients: [
            "đậu phụ",
            "đậu nành",
            "rau xanh",
            "nấm",
            "yến mạch",
            "hạt chia",
            "sữa đậu nành",
          ],
          avoidIngredients: [
            "thịt heo",
            "thịt bò",
            "thịt gà",
            "cá",
            "tôm",
            "trứng",
            "sữa bò",
            "mật ong",
          ],
          description:
            "Bữa sáng chay đầy đủ protein thực vật, năng lượng cho ngày mới",
        },
        lunch: {
          categories: ["Bữa chính", "Bữa trưa"],
          tags: [
            "Món chay",
            "Dinh dưỡng",
            "Protein cao",
            "Chất xơ",
            "Sắt",
            "Vitamin",
          ],
          preferredIngredients: [
            "đậu phụ",
            "nấm các loại",
            "rau củ",
            "gạo lứt",
            "đậu",
            "hạt",
          ],
          avoidIngredients: ["thịt", "cá", "tôm", "trứng", "ngũ cốc", "mắm"],
          description: "Bữa trưa chay đa dạng, đủ chất dinh dưỡng",
        },
        dinner: {
          categories: ["Bữa tối", "Bữa phụ"],
          tags: ["Món chay", "Nhẹ nhàng", "Món nước", "Dễ tiêu", "Thanh mát"],
          preferredIngredients: [
            "rau xanh",
            "nấm",
            "đậu phụ",
            "canh rau",
            "súp nấm",
          ],
          avoidIngredients: ["thịt", "cá", "tôm", "trứng", "sữa động vật"],
          description: "Bữa tối chay thanh đạm, dễ tiêu",
        },
      },
      // 💪 Tăng cân lành mạnh: Calories cao, protein, carb tốt
      "tăng cân": {
        breakfast: {
          minCalories: 550,
          categories: ["Bữa sáng", "Bữa chính"],
          tags: [
            "Tăng cân",
            "Calories cao",
            "Dinh dưỡng",
            "Protein cao",
            "Béo ngậy",
          ],
          preferredIngredients: [
            "trứng",
            "thịt",
            "bơ",
            "sữa tươi",
            "phô mai",
            "yến mạch",
            "chuối",
            "hạt",
          ],
          avoidIngredients: ["đồ ăn nhanh"],
          description: "Bữa sáng giàu calo lành mạnh, protein cao",
        },
        lunch: {
          minCalories: 750,
          categories: ["Bữa chính", "Bữa trưa"],
          tags: [
            "Tăng cân",
            "Calories cao",
            "Protein cao",
            "Món mặn",
            "Dinh dưỡng",
            "Béo ngậy",
          ],
          preferredIngredients: [
            "thịt bò",
            "cá hồi",
            "gạo",
            "khoai lang",
            "bơ",
            "dầu olive",
          ],
          avoidIngredients: ["đồ chiên nhiều dầu"],
          description: "Bữa trưa đầy đủ calories từ nguồn lành mạnh",
        },
        dinner: {
          minCalories: 650,
          categories: ["Bữa chính", "Bữa tối"],
          tags: ["Tăng cân", "Protein cao", "Món mặn", "Dinh dưỡng"],
          preferredIngredients: [
            "thịt",
            "cá",
            "thịt gà",
            "gạo",
            "khoai",
            "trứng",
          ],
          avoidIngredients: ["đồ cay quá"],
          description: "Bữa tối protein cao, carb tốt để tăng cân",
        },
      },
      // 🩺 Tiểu đường: Ít đường, low GI, kiểm soát đường huyết
      "tiểu đường": {
        breakfast: {
          maxCalories: 400,
          maxTime: 25,
          categories: ["Bữa sáng"],
          tags: [
            "Ít đường",
            "Ít calo",
            "Healthy",
            "Chất xơ",
            "Low carb",
            "Protein cao",
          ],
          preferredIngredients: [
            "trứng",
            "rau xanh",
            "đậu phụ",
            "yến mạch ít đường",
            "cá",
            "hạt",
          ],
          avoidIngredients: [
            "đường",
            "mật ong",
            "gạo trắng",
            "bánh mì trắng",
            "khoai tây",
            "trái cây ngọt",
          ],
          description: "Bữa sáng kiểm soát đường huyết, chỉ số GI thấp",
        },
        lunch: {
          maxCalories: 500,
          categories: ["Bữa trưa", "Bữa phụ"],
          tags: [
            "Ít đường",
            "Ít calo",
            "Healthy",
            "Protein cao",
            "Chất xơ",
            "Low carb",
          ],
          preferredIngredients: [
            "cá lóc",
            "ức gà",
            "rau xanh",
            "đậu phụ",
            "gạo lứt ít",
          ],
          avoidIngredients: [
            "đường",
            "cơm trắng",
            "bún phở",
            "khoai tây",
            "nước ngọt",
          ],
          description: "Bữa trưa ít tinh bột, nhiều rau protein",
        },
        dinner: {
          maxCalories: 400,
          categories: ["Bữa tối", "Bữa phụ"],
          tags: ["Ít đường", "Dễ tiêu", "Món nước", "Nhẹ nhàng", "Low carb"],
          preferredIngredients: ["rau xanh", "cá lóc", "tôm", "canh rau"],
          avoidIngredients: ["đường", "tinh bột", "cơm", "mì", "trái cây ngọt"],
          description: "Bữa tối rất nhẹ, tránh tinh bột và đường",
        },
      },
      // ⏰ Người bận rộn: Nhanh, đơn giản, tiện lợi
      "người bận rộn": {
        breakfast: {
          maxTime: 15,
          difficulty: "Dễ",
          categories: ["Bữa sáng"],
          tags: ["Nhanh", "Dễ làm", "Đơn giản", "Tiện lợi", "Dinh dưỡng"],
          preferredIngredients: [
            "trứng",
            "bánh mì",
            "sữa",
            "yến mạch",
            "chuối",
            "sữa chua",
          ],
          avoidIngredients: ["nguyên liệu phức tạp"],
          description: "Bữa sáng siêu nhanh, dưới 15 phút",
        },
        lunch: {
          maxTime: 30,
          difficulty: "Dễ",
          categories: ["Bữa chính", "Bữa trưa"],
          tags: ["Nhanh", "Dễ làm", "Đơn giản", "Món mặn", "Dinh dưỡng"],
          preferredIngredients: [
            "thịt băm",
            "cá phi lê",
            "gạo",
            "rau sẵn",
            "trứng",
          ],
          avoidIngredients: ["nguyên liệu cần sơ chế lâu"],
          description: "Bữa trưa nhanh gọn, đủ chất",
        },
        dinner: {
          maxTime: 20,
          difficulty: "Dễ",
          categories: ["Bữa phụ", "Bữa tối"],
          tags: ["Nhanh", "Dễ làm", "Đơn giản", "Món nước", "Nhẹ nhàng"],
          preferredIngredients: ["rau", "thịt gà", "tôm", "canh nhanh"],
          avoidIngredients: ["món cần nấu lâu"],
          description: "Bữa tối cực nhanh, dễ dọn dẹp",
        },
      },
      // 👴 Người cao tuổi: Mềm, dễ tiêu, dễ nhai, nhiều dinh dưỡng
      "người già": {
        breakfast: {
          maxTime: 30,
          difficulty: "Dễ",
          categories: ["Bữa sáng"],
          tags: [
            "Dễ tiêu",
            "Mềm",
            "Dinh dưỡng",
            "Món nước",
            "Canxi",
            "Vitamin",
            "Dễ hấp thu",
          ],
          preferredIngredients: [
            "cháo",
            "trứng",
            "sữa",
            "cá lóc",
            "đậu phụ mềm",
            "yến mạch",
          ],
          avoidIngredients: ["đồ cứng", "đồ dai", "đồ cay"],
          description: "Bữa sáng mềm mịn, dễ nhai, giàu canxi",
        },
        lunch: {
          maxTime: 45,
          difficulty: "Dễ",
          categories: ["Bữa chính", "Bữa trưa"],
          tags: [
            "Dễ tiêu",
            "Mềm",
            "Dinh dưỡng",
            "Món nước",
            "Protein cao",
            "Omega-3",
            "Vitamin",
          ],
          preferredIngredients: [
            "cá lóc",
            "tôm",
            "rau mềm",
            "đậu phụ",
            "canh",
            "súp",
          ],
          avoidIngredients: ["thịt dai", "đồ chiên giòn", "cay nồng"],
          description: "Bữa trưa mềm, đầy đủ chất, dễ tiêu hóa",
        },
        dinner: {
          maxTime: 30,
          difficulty: "Dễ",
          categories: ["Bữa tối", "Bữa phụ"],
          tags: ["Dễ tiêu", "Nhẹ nhàng", "Món nước", "Mềm", "Thanh mát"],
          preferredIngredients: [
            "rau luộc",
            "cá lóc",
            "tôm",
            "canh nhạt",
            "cháo loãng",
          ],
          avoidIngredients: ["thịt heo", "thịt bò", "đồ cứng", "đồ cay"],
          description: "Bữa tối rất nhẹ, mềm, dễ tiêu để ngủ ngon",
        },
      },
      // 🏋️ Tập gym/Thể hình: Protein cực cao, carb tốt, ít mỡ
      "thể hình": {
        breakfast: {
          minCalories: 550,
          categories: ["Bữa sáng", "Bữa chính"],
          tags: ["Protein cao", "Tăng cơ", "Gym", "Dinh dưỡng", "Ít dầu mỡ"],
          preferredIngredients: [
            "trứng trắng",
            "ức gà",
            "yến mạch",
            "chuối",
            "sữa protein",
            "bơ đậu phộng",
          ],
          avoidIngredients: ["đồ chiên", "mỡ nhiều"],
          description: "Bữa sáng protein cao, carb tốt cho tập luyện",
        },
        lunch: {
          minCalories: 800,
          categories: ["Bữa chính", "Bữa trưa"],
          tags: [
            "Protein cao",
            "Tăng cơ",
            "Gym",
            "Món mặn",
            "Dinh dưỡng",
            "Ít dầu mỡ",
          ],
          preferredIngredients: [
            "ức gà",
            "thịt bò nạc",
            "cá hồi",
            "gạo lứt",
            "khoai lang",
            "trứng",
            "rau xanh",
          ],
          avoidIngredients: ["dầu mỡ nhiều", "đồ chiên"],
          description: "Bữa trưa protein cực cao, carb phức hợp cho tăng cơ",
        },
        dinner: {
          minCalories: 600,
          categories: ["Bữa chính", "Bữa tối"],
          tags: ["Protein cao", "Tăng cơ", "Món mặn", "Ít dầu mỡ", "Low carb"],
          preferredIngredients: [
            "ức gà",
            "cá",
            "thịt bò nạc",
            "rau xanh",
            "trứng",
          ],
          avoidIngredients: ["dầu mỡ", "đường", "tinh bột nhiều"],
          description: "Bữa tối protein cao, ít carb cho phục hồi cơ",
        },
      },

      // 🤰 Phụ nữ mang thai: Dinh dưỡng cao, an toàn, đủ chất
      "mang thai": {
        breakfast: {
          maxTime: 25,
          categories: ["Bữa sáng"],
          tags: [
            "Dinh dưỡng",
            "Vitamin",
            "Canxi",
            "Sắt",
            "Dễ tiêu",
            "Nhẹ nhàng",
          ],
          preferredIngredients: [
            "trứng",
            "sữa",
            "yến mạch",
            "rau xanh",
            "trái cây",
            "hạt",
          ],
          avoidIngredients: ["đồ sống", "rượu", "cafe nhiều", "đồ cay nồng"],
          description: "Bữa sáng đầy đủ dinh dưỡng cho mẹ và bé",
        },
        lunch: {
          categories: ["Bữa chính", "Bữa trưa"],
          tags: [
            "Dinh dưỡng",
            "Protein cao",
            "Sắt",
            "Canxi",
            "Vitamin",
            "Omega-3",
          ],
          preferredIngredients: [
            "cá hồi",
            "thịt nạc",
            "rau xanh",
            "đậu",
            "gạo lứt",
            "sữa",
          ],
          avoidIngredients: ["đồ sống", "gan", "cá ngừ", "rượu"],
          description: "Bữa trưa giàu sắt, canxi, omega-3 cho thai nhi",
        },
        dinner: {
          categories: ["Bữa tối", "Bữa phụ"],
          tags: ["Nhẹ nhàng", "Dễ tiêu", "Dinh dưỡng", "Vitamin", "Món nước"],
          preferredIngredients: ["cá", "tôm", "rau", "canh", "đậu phụ"],
          avoidIngredients: ["đồ cay", "đồ chiên", "cafe"],
          description: "Bữa tối nhẹ nhàng, dễ tiêu, tránh ợ nóng",
        },
      },

      // 🧒 Trẻ em: Hấp dẫn, dễ ăn, giàu dinh dưỡng
      "trẻ em": {
        breakfast: {
          maxTime: 20,
          categories: ["Bữa sáng"],
          tags: [
            "Dinh dưỡng",
            "Dễ ăn",
            "Canxi",
            "Vitamin",
            "Protein cao",
            "Hấp dẫn",
          ],
          preferredIngredients: [
            "trứng",
            "sữa",
            "bánh mì",
            "phô mai",
            "chuối",
            "yến mạch",
          ],
          avoidIngredients: ["đồ cay", "cafe", "đồ quá mặn"],
          description: "Bữa sáng bổ dưỡng, hấp dẫn để bé thích ăn",
        },
        lunch: {
          categories: ["Bữa chính", "Bữa trưa"],
          tags: [
            "Dinh dưỡng",
            "Protein cao",
            "Canxi",
            "Vitamin",
            "Dễ ăn",
            "Hấp dẫn",
          ],
          preferredIngredients: [
            "thịt",
            "cá",
            "trứng",
            "rau củ",
            "gạo",
            "phô mai",
          ],
          avoidIngredients: ["đồ cay", "xương nhiều", "đồ quá cứng"],
          description: "Bữa trưa đầy đủ chất cho trẻ phát triển",
        },
        dinner: {
          categories: ["Bữa tối", "Bữa phụ"],
          tags: ["Nhẹ nhàng", "Dễ tiêu", "Dinh dưỡng", "Dễ ăn", "Món nước"],
          preferredIngredients: ["thịt gà", "cá", "rau", "canh", "cháo"],
          avoidIngredients: ["đồ cay", "đồ cứng", "xương nhiều"],
          description: "Bữa tối mềm, nhẹ để bé ngủ ngon",
        },
      },

      // 🎓 Học sinh/Sinh viên: Giá rẻ, nhanh, đủ chất
      "học sinh": {
        breakfast: {
          maxTime: 15,
          difficulty: "Dễ",
          categories: ["Bữa sáng"],
          tags: ["Nhanh", "Dễ làm", "Dinh dưỡng", "Giá rẻ", "Tiện lợi"],
          preferredIngredients: ["trứng", "bánh mì", "sữa", "cháo", "mì"],
          avoidIngredients: ["nguyên liệu đắt"],
          description: "Bữa sáng nhanh gọn, rẻ, đủ năng lượng học tập",
        },
        lunch: {
          maxTime: 30,
          categories: ["Bữa chính", "Bữa trưa"],
          tags: ["Dễ làm", "Món mặn", "Dinh dưỡng", "Giá rẻ", "Tiện lợi"],
          preferredIngredients: ["thịt", "cá", "gạo", "rau", "trứng"],
          avoidIngredients: ["nguyên liệu đắt tiền"],
          description: "Bữa trưa đơn giản, rẻ, đủ chất",
        },
        dinner: {
          maxTime: 25,
          categories: ["Bữa phụ", "Bữa tối"],
          tags: ["Nhanh", "Dễ làm", "Món nước", "Giá rẻ"],
          preferredIngredients: ["rau", "thịt", "mì", "canh đơn giản"],
          avoidIngredients: ["nguyên liệu phức tạp"],
          description: "Bữa tối đơn giản, tiết kiệm",
        },
      },

      // 💼 Dân văn phòng cao cấp: Healthy, organic, chất lượng cao
      "cao cấp": {
        breakfast: {
          maxTime: 30,
          categories: ["Bữa sáng"],
          tags: ["Healthy", "Organic", "Dinh dưỡng", "Cao cấp", "Tinh tế"],
          preferredIngredients: [
            "trứng gà ta",
            "bơ",
            "cá hồi",
            "yến mạch organic",
            "sữa hạt",
            "trái cây nhập",
          ],
          avoidIngredients: ["đồ chế biến sẵn"],
          description: "Bữa sáng cao cấp, organic, healthy",
        },
        lunch: {
          categories: ["Bữa chính", "Bữa trưa"],
          tags: [
            "Healthy",
            "Organic",
            "Dinh dưỡng",
            "Cao cấp",
            "Tinh tế",
            "Protein cao",
          ],
          preferredIngredients: [
            "thịt bò Úc",
            "cá hồi",
            "rau organic",
            "gạo lứt hữu cơ",
          ],
          avoidIngredients: ["đồ đông lạnh"],
          description: "Bữa trưa cao cấp, nguyên liệu tươi sống",
        },
        dinner: {
          categories: ["Bữa tối"],
          tags: ["Healthy", "Nhẹ nhàng", "Cao cấp", "Tinh tế", "Dễ tiêu"],
          preferredIngredients: [
            "cá tươi",
            "tôm hùm",
            "rau organic",
            "súp cao cấp",
          ],
          avoidIngredients: ["đồ rẻ tiền"],
          description: "Bữa tối sang trọng, nhẹ nhàng",
        },
      },
    };

    // Get base criteria for the meal plan type
    let baseCriteria = criteriaMap[normalized] || {
      breakfast: {
        difficulty: "Dễ",
        maxTime: 30,
        categories: ["Bữa sáng"],
        tags: [],
      },
      lunch: {
        difficulty: "Dễ",
        maxTime: 45,
        categories: ["Bữa chính", "Bữa trưa"],
        tags: [],
      },
      dinner: {
        difficulty: "Dễ",
        maxTime: 30,
        categories: ["Bữa tối"],
        tags: [],
      },
    };

    // 🎯 Apply user's specific requirements to each meal
    const applyCustomRequirements = (mealCriteria) => {
      const customCriteria = { ...mealCriteria };

      // 1. Adjust calories if specified
      if (mealPlanCalories) {
        const dailyCalories = parseInt(mealPlanCalories);
        // Phân bổ: Sáng 25%, Trưa 40%, Tối 35%
        if (mealCriteria === baseCriteria.breakfast) {
          customCriteria.maxCalories = Math.floor(dailyCalories * 0.25);
        } else if (mealCriteria === baseCriteria.lunch) {
          customCriteria.maxCalories = Math.floor(dailyCalories * 0.40);
        } else if (mealCriteria === baseCriteria.dinner) {
          customCriteria.maxCalories = Math.floor(dailyCalories * 0.35);
        }
      }

      // 2. Add nutrition focus tags
      if (nutritionFocus) {
        customCriteria.tags = customCriteria.tags || [];
        if (!customCriteria.tags.includes(nutritionFocus)) {
          customCriteria.tags.push(nutritionFocus);
        }
      }

      // 3. Merge avoid ingredients
      customCriteria.avoidIngredients = [
        ...(customCriteria.avoidIngredients || []),
        ...allergies,
        ...avoidIngredients
      ];

      // 4. Add required dishes constraints
      customCriteria.requiredDishes = requiredDishes;

      // 5. Add excluded dishes constraints
      customCriteria.excludedDishes = excludedDishes;

      // 6. Add dish type constraints
      if (dishTypeConstraints) {
        customCriteria.dishTypeConstraints = dishTypeConstraints;
      }

      return customCriteria;
    };

    return {
      breakfast: applyCustomRequirements(baseCriteria.breakfast),
      lunch: applyCustomRequirements(baseCriteria.lunch),
      dinner: applyCustomRequirements(baseCriteria.dinner)
    };
  }

  // Use AI to intelligently select recipes (meal-time specific)
  async selectRecipesWithAI(allRecipes, mealContext, duration, usedRecipeIds = [], entities = {}) {
    const needed = duration; // For specific meal time (e.g., 7 breakfast recipes for 7 days)

    const {
      requiredDishes = [],
      excludedDishes = [],
      allergies = [],
      avoidIngredients = [],
      nutritionFocus,
      dishTypeConstraints,
      mealPlanCalories
    } = entities;

    // 🚫 LOẠI BỎ món đã sử dụng trong cùng ngày
    const availableRecipes = allRecipes.filter(r => !usedRecipeIds.includes(r._id));
    
    if (availableRecipes.length === 0) {
      console.log(`⚠️ No available recipes after removing used ones. Using all recipes.`);
      // Fallback: nếu không còn món mới, dùng lại nhưng cố gắng chọn khác
    }

    const recipesToUse = availableRecipes.length > 0 ? availableRecipes : allRecipes;

    // If we have enough recipes, use AI to select best ones
    if (recipesToUse.length >= needed) {
      console.log(
        `🤖 Using AI to select best ${needed} recipes for: ${mealContext} (${usedRecipeIds.length} recipes already used)`
      );

      // Build special requirements text for AI prompt
      let specialRequirementsText = '';
      
      if (requiredDishes.length > 0) {
        specialRequirementsText += `\n🎯 MÓN BẮT BUỘC PHẢI CÓ: ${requiredDishes.join(', ')}`;
      }
      
      if (excludedDishes.length > 0) {
        specialRequirementsText += `\n🚫 MÓN TUYỆT ĐỐI KHÔNG ĐƯỢC CHỌN: ${excludedDishes.join(', ')}`;
      }
      
      if (allergies.length > 0) {
        specialRequirementsText += `\n⚠️ DỊ ỨNG (tránh nguyên liệu): ${allergies.join(', ')}`;
      }
      
      if (avoidIngredients.length > 0) {
        specialRequirementsText += `\n❌ KHÔNG ĂN ĐƯỢC (tránh nguyên liệu): ${avoidIngredients.join(', ')}`;
      }
      
      if (nutritionFocus) {
        specialRequirementsText += `\n💪 TRỌNG TÂM DINH DƯỠNG: ${nutritionFocus}`;
      }
      
      if (dishTypeConstraints) {
        specialRequirementsText += `\n🍽️ RÀNG BUỘC LOẠI MÓN: ${dishTypeConstraints}`;
      }
      
      if (mealPlanCalories) {
        specialRequirementsText += `\n🔥 MỤC TIÊU CALO MỖI NGÀY: ${mealPlanCalories} kcal`;
      }

      const selectionPrompt = `
🤖 BẠN LÀ CHUYÊN GIA DINH DƯỠNG VÀ ẨM THỰC

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 NHIỆM VỤ: Chọn ${needed} món ăn TỐT NHẤT cho "${mealContext}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${specialRequirementsText ? `
🌟 YÊU CẦU ĐẶC BIỆT (QUAN TRỌNG - ƯU TIÊN CAO NHẤT):${specialRequirementsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
` : ''}

📋 DANH SÁCH ${recipesToUse.length} MÓN ĂN SẴN CÓ (Top ${Math.min(
        50,
        recipesToUse.length
      )}):
${recipesToUse
  .slice(0, 50)
  .map((r, idx) => {
    const tags = r.tags ? r.tags.map((t) => t.name || t).join(", ") : "";
    const category = r.category ? r.category.name || r.category : "";
    const ingredients = r.ingredients ? r.ingredients.slice(0, 5).map(i => i.name || i).join(", ") : "";
    return `${idx + 1}. ${r._id} | ${r.name} | ⭐${r.rate || 0}/5 | ⏱${
      r.time
    }m | 🔥${r.calories || "N/A"}cal | ${
      r.difficulty
    } | 📁${category} | 🏷️${tags} | 🥘${ingredients}${ingredients.length > 0 ? '...' : ''}`;
  })
  .join("\n")}

${usedRecipeIds.length > 0 ? `
⚠️ CÁC MÓN ĐÃ DÙNG TRONG CÁC BỮA ĂN KHÁC (TRÁNH CHỌN TRỪ KHI CẦN THIẾT):
${usedRecipeIds.join(", ")}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ TIÊU CHÍ CHỌN MÓN (THEO THỨ TỰ ƯU TIÊN):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 ƯU TIÊN CAO NHẤT: 
   ${requiredDishes.length > 0 ? `• BẮT BUỘC chọn các món: ${requiredDishes.join(', ')}` : ''}
   ${excludedDishes.length > 0 ? `• TUYỆT ĐỐI KHÔNG chọn các món: ${excludedDishes.join(', ')}` : ''}
   ${allergies.length > 0 ? `• TRÁNH nguyên liệu dị ứng: ${allergies.join(', ')}` : ''}
   ${avoidIngredients.length > 0 ? `• TRÁNH nguyên liệu không ăn được: ${avoidIngredients.join(', ')}` : ''}
   • MỖI MÓN CHỈ CHỌN 1 LẦN trong ${needed} món
   • TUYỆT ĐỐI KHÔNG lặp lại món giống nhau

1. ⭐ RATING CAO: Ưu tiên món có rating ≥ 4.0 sao

2. 🎨 ĐA DẠNG TỐI ĐA: 
   • ${needed} món phải là ${needed} món KHÁC NHAU HOÀN TOÀN
   • Tránh món tương tự (ví dụ: không chọn cả "Gà xào" và "Gà chiên")
   • Đa dạng nguyên liệu chính (gà, bò, heo, cá, tôm, rau...)

3. 🍽️ PHÙ HỢP BỮA ĂN: Phải match với "${mealContext}"
   • Bữa sáng: Nhẹ, nhanh, protein + carb (trứng, bánh mì, cháo, phở...)
   • Bữa trưa: Đầy đủ, chính món (cơm, thịt, cá, rau...), có thể no hơn
   • Bữa tối: Nhẹ, dễ tiêu, không quá no (canh, xào rau, hấp...)

4. ⚖️ CÂN BẰNG DINH DƯỠNG qua ${needed} món:
   ${nutritionFocus ? `• TRỌNG TÂM: ${nutritionFocus}` : ''}
   • Protein (Thịt/Cá/Trứng): 40%
   • Rau củ: 30%
   • Carb (Cơm/Bún/Mì): 25%
   • Khác: 5%

5. 🌈 ĐA DẠNG NGUYÊN LIỆU & CHẾ BIẾN:
   • Nguyên liệu chính KHÁC NHAU (gà, bò, heo, cá, tôm, đậu, trứng...)
   • Cách chế biến KHÁC NHAU (xào, nấu, hấp, chiên, nướng, luộc...)
   • Ẩm thực KHÁC NHAU (Việt, Hàn, Nhật, Ý, Thái...)

6. ⏰ THỜI GIAN HỢP LÝ:
   • Bữa sáng: < 30 phút
   • Bữa trưa: 30-60 phút
   • Bữa tối: < 45 phút

7. 🔥 CALO PHÙ HỢP:
   ${mealPlanCalories ? `• Tổng calo các món nên phù hợp với mục tiêu ${mealPlanCalories} kcal/ngày` : ''}
   • Bữa sáng: 300-500 kcal
   • Bữa trưa: 500-800 kcal  
   • Bữa tối: 300-600 kcal

8. 🔥 ĐỘ KHÓ: Ưu tiên "Dễ" (60%), "Trung bình" (30%), "Khó" (10%)

9. 🏷️ TAGS PHÙ HỢP: Chọn món có tags match với meal context

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 ĐỊNH DẠNG TRẢ VỀ:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Trả về ĐÚNG ${needed} ID món ăn dưới dạng JSON array (CHỈ JSON, KHÔNG text khác):

["id1", "id2", "id3", "id4", "id5", "id6", "id7"]

⚠️ LƯU Ý:
- Phải chọn ĐÚNG ${needed} món
- Mỗi ID chỉ xuất hiện 1 LẦN (KHÔNG trùng)
- ${needed} món phải HOÀN TOÀN KHÁC NHAU
- ${requiredDishes.length > 0 ? `BẮT BUỘC bao gồm các món: ${requiredDishes.join(', ')}` : ''}
- KHÔNG thêm giải thích
- CHỈ JSON array thuần túy
`;

      try {
        const result = await this.model.generateContent(selectionPrompt);
        const response = await result.response;
        const text = response.text();

        const jsonMatch = text.match(/\[[\s\S]*?\]/);
        if (jsonMatch) {
          const selectedIds = JSON.parse(jsonMatch[0]);
          const selected = recipesToUse
            .filter((r) => selectedIds.includes(r._id))
            .slice(0, needed);
          console.log(
            `✅ AI selected ${selected.length}/${needed} recipes for ${mealContext}`
          );
          return selected;
        }
      } catch (error) {
        console.error(
          `⚠️ Error selecting recipes with AI for ${mealContext}:`,
          error.message
        );
      }
    }

    // Fallback: Smart random selection
    console.log(`🎲 Using smart random selection for ${mealContext}...`);
    return this.smartRandomSelection(recipesToUse, needed);
  }

  // Smart random selection (fallback)
  smartRandomSelection(recipes, needed) {
    const shuffled = [...recipes].sort(() => Math.random() - 0.5);

    // If not enough unique recipes, repeat them evenly
    if (shuffled.length < needed) {
      console.log(
        `⚠️ Only ${shuffled.length} unique recipes available for ${needed} days, will space repeats evenly`
      );
      const result = [];
      
      // Chia đều: Nếu có 4 món cho 7 ngày → [A, B, C, D, A, B, C]
      for (let i = 0; i < needed; i++) {
        result.push(shuffled[i % shuffled.length]);
      }
      
      return result;
    }

    return shuffled.slice(0, needed);
  }

  // 🆕 Create INTELLIGENT 7-day meal plan structure (meal-time specific)
  // ✅ UPDATED: Return structure phù hợp với MealPlanSchema (morning/noon/evening, NO date)
  // Frontend sẽ add date khi user chọn startDate
  createIntelligentMealPlanStructure(
    breakfastRecipes,
    lunchRecipes,
    dinnerRecipes,
    duration = 7
  ) {
    const plans = [];
    const usedRecipesPerDay = {}; // Track recipes used each day to avoid duplicates
    const globalRecipeUsage = {}; // Track when each recipe was last used (for spacing)

    for (let day = 0; day < duration; day++) {
      usedRecipesPerDay[day] = new Set(); // Track recipes for this specific day

      const dayPlan = {
        // ❌ NO DATE - FE will add based on user's selected startDate
        morning: {},
        noon: {},
        evening: {},
      };

      // 🌅 Breakfast - Get recipe for this day with spacing logic
      let breakfastRecipe = breakfastRecipes[day % breakfastRecipes.length];
      let breakfastAttempts = 0;
      
      // Nếu món này vừa dùng gần đây (< 2 ngày), tìm món khác
      while (
        breakfastRecipe &&
        breakfastAttempts < breakfastRecipes.length
      ) {
        const recipeId = breakfastRecipe._id.toString();
        const lastUsedDay = globalRecipeUsage[recipeId];
        
        // Kiểm tra: Món này đã dùng trong cùng ngày HOẶC dùng quá gần (< 2 ngày trước)
        const isTooClose = lastUsedDay !== undefined && (day - lastUsedDay) < 2;
        const isDuplicateInDay = usedRecipesPerDay[day].has(recipeId);
        
        if (!isDuplicateInDay && !isTooClose) {
          break; // Món này OK, dùng được
        }
        
        // Tìm món khác
        breakfastAttempts++;
        breakfastRecipe = breakfastRecipes[(day + breakfastAttempts) % breakfastRecipes.length];
      }
      
      if (breakfastRecipe) {
        const recipeId = breakfastRecipe._id.toString();
        dayPlan.morning = {
          recipeId: recipeId,
          recipeName: breakfastRecipe.name,
          recipeImage: breakfastRecipe.image,
        };
        usedRecipesPerDay[day].add(recipeId);
        globalRecipeUsage[recipeId] = day; // Ghi nhận ngày sử dụng
      }

      // 🌞 Lunch - Avoid duplicate with breakfast + spacing logic
      let lunchRecipe = lunchRecipes[day % lunchRecipes.length];
      let lunchAttempts = 0;
      
      while (
        lunchRecipe &&
        lunchAttempts < lunchRecipes.length
      ) {
        const recipeId = lunchRecipe._id.toString();
        const lastUsedDay = globalRecipeUsage[recipeId];
        
        const isTooClose = lastUsedDay !== undefined && (day - lastUsedDay) < 2;
        const isDuplicateInDay = usedRecipesPerDay[day].has(recipeId);
        
        if (!isDuplicateInDay && !isTooClose) {
          break;
        }
        
        lunchAttempts++;
        lunchRecipe = lunchRecipes[(day + lunchAttempts) % lunchRecipes.length];
      }
      
      if (lunchRecipe) {
        const recipeId = lunchRecipe._id.toString();
        dayPlan.noon = {
          recipeId: recipeId,
          recipeName: lunchRecipe.name,
          recipeImage: lunchRecipe.image,
        };
        usedRecipesPerDay[day].add(recipeId);
        globalRecipeUsage[recipeId] = day;
      }

      // 🌙 Dinner - Avoid duplicate with breakfast & lunch + spacing logic
      let dinnerRecipe = dinnerRecipes[day % dinnerRecipes.length];
      let dinnerAttempts = 0;
      
      while (
        dinnerRecipe &&
        dinnerAttempts < dinnerRecipes.length
      ) {
        const recipeId = dinnerRecipe._id.toString();
        const lastUsedDay = globalRecipeUsage[recipeId];
        
        const isTooClose = lastUsedDay !== undefined && (day - lastUsedDay) < 2;
        const isDuplicateInDay = usedRecipesPerDay[day].has(recipeId);
        
        if (!isDuplicateInDay && !isTooClose) {
          break;
        }
        
        dinnerAttempts++;
        dinnerRecipe = dinnerRecipes[(day + dinnerAttempts) % dinnerRecipes.length];
      }
      
      if (dinnerRecipe) {
        const recipeId = dinnerRecipe._id.toString();
        dayPlan.evening = {
          recipeId: recipeId,
          recipeName: dinnerRecipe.name,
          recipeImage: dinnerRecipe.image,
        };
        usedRecipesPerDay[day].add(recipeId);
        globalRecipeUsage[recipeId] = day;
      }

      plans.push(dayPlan);
    }

    console.log(
      `✅ Created INTELLIGENT ${plans.length} days meal plan (NO duplicates in same day, min 2-day spacing for repeats)`
    );
    return plans;
  }

  // Create 7-day meal plan structure (without dates - FE will add when user selects startDate)
  // ⚠️ DEPRECATED - Use createIntelligentMealPlanStructure instead
  createMealPlanStructure(recipes, duration = 7) {
    const mealTypes = ["morning", "noon", "evening"];
    const plans = [];

    for (let day = 0; day < duration; day++) {
      const dayPlan = {
        // ❌ NO DATE - FE will add based on user's selected startDate
        morning: {},
        noon: {},
        evening: {},
      };

      for (let mealIndex = 0; mealIndex < 3; mealIndex++) {
        const recipeIndex = day * 3 + mealIndex;
        const recipe = recipes[recipeIndex];

        if (recipe) {
          dayPlan[mealTypes[mealIndex]] = {
            recipeId: recipe._id,
            recipeName: recipe.name,
            recipeImage: recipe.image,
          };
        }
        // else: already initialized as empty object
      }

      plans.push(dayPlan);
    }

    console.log(
      `✅ Created ${plans.length} days meal plan structure (without dates)`
    );
    return plans;
  }

  // Generate response using Gemini with context
  async generateResponse(
    userMessage,
    relevantData,
    conversationHistory = [],
    imageUrl = null
  ) {
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
      contextPrompt += "\n### Lịch sử hội thoại:\n";
      const recentHistory = conversationHistory.slice(-4); // Last 2 exchanges
      recentHistory.forEach((msg) => {
        contextPrompt += `${msg.role === "user" ? "Người dùng" : "Trợ lý"}: ${
          msg.content
        }\n`;
      });
    }

    // Add image analysis if available
    if (relevantData.imageAnalysis) {
      contextPrompt += "\n### Phân tích ảnh món ăn:\n";
      contextPrompt += JSON.stringify(relevantData.imageAnalysis, null, 2);

      if (relevantData.foundInDatabase === false) {
        contextPrompt += `\n\nMón "${relevantData.searchedDishName}" KHÔNG CÓ trong database của Kooka.\n`;
        contextPrompt +=
          "Hãy lịch sự thông báo và chia sẻ thông tin về món ăn này dựa trên ảnh và kiến thức của bạn.\n";
      } else if (relevantData.foundInDatabase === true) {
        contextPrompt += `\n\nMón "${relevantData.recipe.name}" CÓ trong database! Hãy sử dụng thông tin chi tiết bên dưới.\n`;
      }
    }

    // Add relevant data if available (summarize if too long)
    if (Object.keys(relevantData).length > 0) {
      contextPrompt += "\n### Dữ liệu liên quan:\n";

      // Handle generated meal plan
      if (relevantData.generatedMealPlan) {
        const mealPlanData = relevantData.generatedMealPlan;
        if (mealPlanData.success) {
          contextPrompt += JSON.stringify(
            {
              mealPlanGenerated: true,
              type: mealPlanData.mealPlanType,
              totalRecipes: mealPlanData.totalRecipes,
              duration: mealPlanData.duration,
            },
            null,
            2
          );

          contextPrompt +=
            '\n\n✅ Đã tạo meal plan thành công! Hãy thông báo với người dùng rằng meal plan đã được tạo và hướng dẫn họ nhấn vào nút "Xem Meal Plan" bên dưới để xem chi tiết. KHÔNG liệt kê các món ăn. Chỉ cần thông báo thành công và khuyến khích họ xem chi tiết.';
        } else {
          contextPrompt +=
            "\n\n❌ Không thể tạo meal plan. Hãy xin lỗi người dùng và đề xuất họ thử lại với tiêu chí khác hoặc chọn loại meal plan khác.";
        }
      }
      // Handle recipe not found case
      else if (relevantData.recipeNotFound) {
        contextPrompt += `\nMón "${relevantData.searchedRecipeName}" KHÔNG CÓ trong database của Kooka.\n`;
        contextPrompt +=
          "Hãy lịch sự thông báo với người dùng rằng hiện tại ứng dụng chưa có công thức này, ";
        contextPrompt +=
          "nhưng bạn có thể chia sẻ một số thông tin chung về món ăn này dựa trên kiến thức của bạn (ngắn gọn).\n";
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
          ingredients:
            recipe.ingredients?.map((i) => ({
              name: i.name,
              quantity: i.quantity || null,
            })) || [],
          instructions:
            recipe.instructions?.map((inst, idx) => ({
              step: idx + 1,
              title: inst.title,
              subTitle: inst.subTitle,
            })) || [],
          video: recipe.video || null,
          rate: recipe.rate || 0,
          numberOfRate: recipe.numberOfRate || 0,
        };

        contextPrompt += JSON.stringify({ recipe: recipeDetail }, null, 2);

        // Add reviews if available
        if (relevantData.reviews && relevantData.reviews.length > 0) {
          contextPrompt += "\n\n### Đánh giá từ người dùng:\n";
          const reviewsSummary = relevantData.reviews.slice(0, 3).map((r) => ({
            rating: r.rating,
            comment: r.comment,
          }));
          contextPrompt += JSON.stringify({ reviews: reviewsSummary }, null, 2);
        }

        // 🔴 QUAN TRỌNG: Kiểm tra xem có instructions hay không
        const hasInstructions = recipe.instructions && recipe.instructions.length > 0;
        
        if (hasInstructions) {
          // Có instructions - BẮT BUỘC phải trình bày đầy đủ
          contextPrompt +=
            "\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
          contextPrompt +=
            "🔴 QUAN TRỌNG TUYỆT ĐỐI - YÊU CẦU BẮT BUỘC:\n";
          contextPrompt +=
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
          contextPrompt +=
            `Món này có SẴN ${recipe.instructions.length} bước hướng dẫn chi tiết trong data JSON!\n\n`;
          contextPrompt +=
            "⛔ NGHIÊM CẤM:\n";
          contextPrompt +=
            "- KHÔNG ĐƯỢC tự sáng tác, bịa đặt, hoặc thêm thắt bước nào\n";
          contextPrompt +=
            "- KHÔNG ĐƯỢC thay đổi tiêu đề (title) của bước\n";
          contextPrompt +=
            "- KHÔNG ĐƯỢC viết lại nội dung (subTitle)\n";
          contextPrompt +=
            "- KHÔNG ĐƯỢC thay đổi thứ tự các bước\n\n";
          contextPrompt +=
            "✅ BẮT BUỘC:\n";
          contextPrompt +=
            "- COPY CHÍNH XÁC từng title từ JSON data\n";
          contextPrompt +=
            "- COPY CHÍNH XÁC từng subTitle (nếu là Array thì nối lại bằng dấu chấm hoặc xuống dòng)\n";
          contextPrompt +=
            `- Phải có ĐỦ ${recipe.instructions.length} bước, KHÔNG ĐƯỢC thiếu bất kỳ bước nào\n\n`;
          contextPrompt +=
            "📋 FORMAT BẮT BUỘC:\n\n";
          contextPrompt +=
            "**Các bước làm:**\n\n";
          contextPrompt +=
            '**Bước 1: [COPY CHÍNH XÁC "title" từ instructions[0]]**\n';
          contextPrompt +=
            '[COPY CHÍNH XÁC "subTitle" từ instructions[0] - nếu là Array thì format thành danh sách hoặc đoạn văn]\n\n';
          contextPrompt +=
            '**Bước 2: [COPY CHÍNH XÁC "title" từ instructions[1]]**\n';
          contextPrompt +=
            '[COPY CHÍNH XÁC "subTitle" từ instructions[1]]\n\n';
          contextPrompt +=
            "...(tiếp tục cho đến hết tất cả các bước)\n\n";
          contextPrompt +=
            "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n";
        } else {
          // Không có instructions
          contextPrompt +=
            "\n\n⚠️ LƯU Ý: Món này CHƯA có hướng dẫn chi tiết các bước làm trong database.\n";
          contextPrompt +=
            'Hãy thông báo: "Hiện Kooka chưa có thông tin chi tiết các bước làm cho món này. Mong bạn thông cảm!"\n';
          contextPrompt +=
            "Nhưng vẫn trình bày đầy đủ các thông tin khác: mô tả, nguyên liệu, thời gian, độ khó, calo...\n";
        }
      }
      // Handle multiple recipes list
      else if (relevantData.recipes && relevantData.recipes.length > 0) {
        const totalRecipes = relevantData.recipes.length;

        // Giới hạn chỉ lấy 6 món phổ biến nhất (sort by rating)
        const topRecipes = relevantData.recipes
          .sort((a, b) => (b.rate || 0) - (a.rate || 0))
          .slice(0, 6);

        const recipesSummary = topRecipes.map((r) => ({
          name: r.name,
          image: r.image,
          rating: r.rate || 0,
          numberOfRatings: r.numberOfRate || 0,
          difficulty: r.difficulty,
          time: r.time,
        }));

        contextPrompt += JSON.stringify(
          {
            totalRecipes: totalRecipes,
            topRecipes: recipesSummary,
          },
          null,
          2
        );

        contextPrompt +=
          "\n\nHãy trình bày NGẮN GỌN danh sách món ăn với lời chào thân thiện.\n";
        contextPrompt += `Format mẫu: "Chào bạn, Kooka đã tìm thấy ${totalRecipes} món ăn hấp dẫn với nguyên liệu [tên nguyên liệu] đây:\n`;
        contextPrompt +=
          "1. 🍜 [Tên món] - ⭐ [rating]/5 ([số đánh giá]) - [độ khó] - [thời gian]\n";
        contextPrompt +=
          "2. � [Tên món] - ⭐ [rating]/5 ([số đánh giá]) - [độ khó] - [thời gian]\n";
        contextPrompt += "...\n";
        contextPrompt += 'Bạn muốn biết chi tiết món nào?"\n\n';
        contextPrompt += `Chỉ hiển thị ${topRecipes.length} món phổ biến nhất${
          totalRecipes > 6 ? ` (từ tổng ${totalRecipes} món tìm được)` : ""
        }.\n`;
        contextPrompt +=
          'KHÔNG được mô tả chi tiết từng món. Chỉ liệt kê ngắn gọn và kết thúc bằng câu "Bạn muốn biết chi tiết món nào?" để khuyến khích người dùng click vào món ăn.';

        // Add filter info if available
        if (relevantData.filters) {
          contextPrompt += "\n\n### Bộ lọc đã áp dụng:\n";
          contextPrompt += JSON.stringify(relevantData.filters, null, 2);
        }
      } else {
        contextPrompt += JSON.stringify(relevantData, null, 2);
      }
    }

    contextPrompt += `\n\n### Câu hỏi của người dùng:\n${userMessage}\n\n### Trả lời (NGẮN GỌN):`;

    try {
      console.log(
        `🤖 Calling Gemini (prompt: ${contextPrompt.length} chars)...`
      );
      const result = await this.model.generateContent(contextPrompt);
      const response = await result.response;

      // Debug: log full response structure
      console.log("📦 Response structure:", {
        hasCandidates: !!response.candidates,
        candidatesCount: response.candidates?.length || 0,
        promptFeedback: response.promptFeedback,
        firstCandidateFinishReason: response.candidates?.[0]?.finishReason,
        firstCandidateSafetyRatings: response.candidates?.[0]?.safetyRatings,
      });

      // Check for safety blocks
      if (response.promptFeedback?.blockReason) {
        console.error("🚫 Blocked:", response.promptFeedback.blockReason);
        throw new Error(`Blocked: ${response.promptFeedback.blockReason}`);
      }

      // Check candidates
      if (!response.candidates || response.candidates.length === 0) {
        console.error("⚠️ No candidates in response");
        throw new Error("No candidates");
      }

      // Check finish reason
      const firstCandidate = response.candidates[0];
      if (
        firstCandidate.finishReason &&
        firstCandidate.finishReason !== "STOP"
      ) {
        console.error("⚠️ Unusual finish reason:", firstCandidate.finishReason);
      }

      const responseText = response.text();

      if (!responseText || responseText.trim() === "") {
        console.error("⚠️ Empty response text");
        console.error(
          "Full candidate:",
          JSON.stringify(firstCandidate, null, 2)
        );
        throw new Error("Empty response");
      }

      console.log(`✅ Response OK (${responseText.length} chars)`);
      return responseText;
    } catch (error) {
      console.error("❌ Gemini error:", error.message);

      // Fallback response based on data
      if (relevantData.recipeNotFound) {
        return `Xin lỗi, hiện tại Kooka chưa có công thức cho món "${relevantData.searchedRecipeName}". Bạn có thể tìm kiếm món khác hoặc hỏi tôi về các món ăn phổ biến khác nhé! 😊`;
      }

      if (relevantData.recipe) {
        return `Tôi tìm thấy món ${relevantData.recipe.name}! Đây là một ${
          relevantData.recipe.short || "món ăn ngon"
        }. Bạn muốn biết thêm thông tin gì về món này?`;
      }

      if (relevantData.recipes && relevantData.recipes.length > 0) {
        const recipeNames = relevantData.recipes.map((r) => r.name).join(", ");
        return `Tôi tìm thấy ${relevantData.recipes.length} món ăn cho bạn: ${recipeNames}. Bạn muốn biết chi tiết món nào?`;
      }

      return "Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.";
    }
  }

  // Save conversation to database
  async saveConversation(
    sessionId,
    userId,
    userMessage,
    assistantMessage,
    metadata = {}
  ) {
    try {
      // Validate that both messages have content
      if (!userMessage || !assistantMessage) {
        console.error("Cannot save conversation: missing content", {
          hasUserMessage: !!userMessage,
          hasAssistantMessage: !!assistantMessage,
        });
        return null;
      }

      let conversation = await Conversation.findOne({ sessionId });

      if (!conversation) {
        conversation = new Conversation({
          sessionId,
          userId,
          messages: [],
        });
      }

      conversation.messages.push(
        { role: "user", content: userMessage, metadata },
        { role: "assistant", content: assistantMessage }
      );

      conversation.updatedAt = new Date();
      await conversation.save();

      return conversation;
    } catch (error) {
      console.error("Error saving conversation:", error);
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
      console.error("Error getting conversation history:", error);
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
        console.log("Image data provided, analyzing...");
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
        this.getConversationHistory(sessionId, 5),
      ]);

      console.log("Intent Analysis:", intentAnalysis);

      // Step 3: Fetch relevant data if needed
      let relevantData = {};

      // If we have dish name from image, try to search for it
      if (dishNameFromImage) {
        const searchResult = await dataFetchService.searchRecipes(
          dishNameFromImage
        );

        if (
          searchResult &&
          searchResult.recipes &&
          searchResult.recipes.length > 0
        ) {
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
        const intentData = await this.fetchRelevantData(
          intentAnalysis.intent,
          intentAnalysis.entities
        );
        relevantData = { ...relevantData, ...intentData };
        console.log("Relevant Data Keys:", Object.keys(relevantData));
      }

      // Step 4: Generate response
      const assistantMessage = await this.generateResponse(
        userMessage,
        relevantData,
        conversationHistory,
        imageData
      );

      // Step 5: Prepare structured response data
      const structuredData = this.prepareStructuredResponse(relevantData);

      // Step 6: Save conversation (don't wait for it)
      this.saveConversation(sessionId, userId, userMessage, assistantMessage, {
        intent: intentAnalysis.intent,
        entities: intentAnalysis.entities,
        hasImage: !!imageData,
        imageAnalysis: imageAnalysis,
      }).catch((err) => console.error("Error saving conversation:", err));

      return {
        success: true,
        message: assistantMessage,
        intent: intentAnalysis.intent,
        structuredData: structuredData,
        data: relevantData,
        imageAnalysis: imageAnalysis,
      };
    } catch (error) {
      console.error("Error in chat:", error);
      return {
        success: false,
        message: "Xin lỗi, đã xảy ra lỗi. Vui lòng thử lại sau.",
        error: error.message,
      };
    }
  }

  // Prepare structured response data for easy rendering
  prepareStructuredResponse(relevantData) {
    const result = {
      recipes: [],
      recipe: null,
      totalCount: 0,
      action: null, // 🆕 NEW: action type for frontend
      generatedMealPlan: null, // 🆕 NEW: meal plan data
    };

    // Handle generated meal plan
    if (relevantData.generatedMealPlan) {
      const mealPlanData = relevantData.generatedMealPlan;
      if (mealPlanData.success) {
        result.action = "redirect_to_meal_planner";
        result.generatedMealPlan = {
          mealPlanType: mealPlanData.mealPlanType,
          duration: mealPlanData.duration,
          // ✅ MOST IMPORTANT: Plans structure (lightweight)
          plans: mealPlanData.mealPlan, // Only contains: recipeId, recipeName, recipeImage
          // ✅ OPTIONAL: Just count for display
          totalRecipes: mealPlanData.totalRecipes,
          // ❌ REMOVED: Full recipes array (too heavy, frontend can fetch by ID if needed)
        };
      }
    }

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
        short: relevantData.recipe.short,
      };
    }

    // Multiple recipes - TRẢ VỀ DANH SÁCH ĐỂ FRONTEND RENDER THÀNH CLICKABLE CARDS
    if (relevantData.recipes && relevantData.recipes.length > 0) {
      result.totalCount = relevantData.recipes.length;

      // Trả về danh sách recipes với thông tin cần thiết để render cards
      result.recipes = relevantData.recipes.map((recipe) => ({
        id: recipe._id,
        name: recipe.name,
        image: recipe.image,
        rating: recipe.rate || 0,
        numberOfRatings: recipe.numberOfRate || 0,
        difficulty: recipe.difficulty,
        time: recipe.time,
        calories: recipe.calories,
        size: recipe.size,
        cuisine: recipe.cuisine?.name || null,
        category: recipe.category?.name || null,
        short: recipe.short,
      }));
    }

    return result;
  }

  // Clear conversation history
  async clearConversation(sessionId) {
    try {
      await Conversation.deleteOne({ sessionId });
      return { success: true, message: "Conversation cleared" };
    } catch (error) {
      console.error("Error clearing conversation:", error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ChatbotService();
