const Recipe = require("../models/Recipe");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { parseBase64 } = require("../utils/parseBase64");
const { uploadIfNeeded } = require("../utils/imageUploader");
const axios = require("axios");

const PYTHON_COOK_SERVICE_URL = process.env.PYTHON_COOK_SERVICE_URL;
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3012';

async function notifySearchService() {
  try {
    const endpoint = `${PYTHON_COOK_SERVICE_URL}/api/reindex`;
    await axios.post(endpoint);
    console.log(
      `[Notify] ✅ Triggered AI service reindex successfully at ${endpoint}`
    );
  } catch (err) {
    console.error("[Notify] ❌ Failed to trigger reindex:", err.message);
  }
}

// Tất cả logic DB sẽ nằm ở đây
async function getAllRecipes() {
  return await Recipe.find()
    .select("-instructions") // ⚡ Loại bỏ instructions để giảm tải
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function getRecipeById(id) {
  // ✅ Chỉ có hàm này mới cần FULL thông tin (bao gồm instructions)
  return await Recipe.findById(id)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

// Giữ lại để backward compatibility, nhưng sẽ dùng uploadIfNeeded
async function uploadIfBase64(file, folder = "recipes") {
  return await uploadIfNeeded(file, folder);
}

async function createRecipe(data) {
  console.log(`[Create Recipe] Starting to create recipe: ${data.name}`);
  const startTime = Date.now();

  // Upload chỉ ảnh chính (video không upload, chỉ lưu URL YouTube)
  if (data.image) {
    data.image = await uploadIfBase64(data.image, "recipes");
  }
  
  // Video không upload lên Cloudinary, giữ nguyên URL YouTube
  // Nếu không có video, model sẽ tự set default

  // Upload ảnh trong instructions song song
  if (Array.isArray(data.instructions)) {
    console.log(`[Create Recipe] Uploading images for ${data.instructions.length} steps...`);
    
    // Tạo danh sách tất cả promises để upload song song
    const uploadPromises = data.instructions.map(async (step) => {
      // Nếu step.images là mảng thì upload từng ảnh song song
      if (Array.isArray(step.images)) {
        const limitedImages = step.images.slice(0, 4); // Giới hạn 4 ảnh
        const uploadedImages = await Promise.all(
          limitedImages.map(img => uploadIfBase64(img, "recipes/steps"))
        );
        step.images = uploadedImages;
      } else if (typeof step.images === "string") {
        // Nếu chỉ có 1 ảnh string
        step.images = [await uploadIfBase64(step.images, "recipes/steps")];
      }
      return step;
    });

    // Đợi tất cả steps upload xong
    await Promise.all(uploadPromises);
  }

  try {
    const recipe = new Recipe(data);
    const saved = await recipe.save();

    const totalTime = Date.now() - startTime;
    console.log(`[Create Recipe] ✅ Recipe created successfully in ${totalTime}ms`);

    // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục (không chờ)
    notifySearchService().catch(err => 
      console.error('[Create Recipe] Failed to notify search service:', err.message)
    );

    return saved;
  } catch (error) {
    console.error(`[Create Recipe] ❌ Failed to create recipe:`, error.message);
    if (error.code === 11000) {
      throw new Error(`Recipe "${data.name}" already exists`);
    }
    throw error;
  }
}

async function updateRecipe(id, data) {
  console.log(`[Update Recipe] Starting to update recipe: ${id}`);
  const startTime = Date.now();

  // Lấy recipe cũ để so sánh thay đổi
  const oldRecipe = await Recipe.findById(id);
  if (!oldRecipe) {
    throw new Error('Recipe not found');
  }

  // Upload chỉ ảnh chính (video không upload, chỉ lưu URL YouTube)
  if (data.image) {
    data.image = await uploadIfBase64(data.image, "recipes");
  }
  
  // Video không upload lên Cloudinary, giữ nguyên URL YouTube

  // Upload ảnh trong instructions song song
  if (Array.isArray(data.instructions)) {
    console.log(`[Update Recipe] Uploading images for ${data.instructions.length} steps...`);
    
    // Tạo danh sách tất cả promises để upload song song
    const uploadPromises = data.instructions.map(async (step) => {
      // Nếu step.images là mảng thì upload từng ảnh song song
      if (Array.isArray(step.images)) {
        const limitedImages = step.images.slice(0, 4); // Giới hạn 4 ảnh
        const uploadedImages = await Promise.all(
          limitedImages.map(img => uploadIfBase64(img, "recipes/steps"))
        );
        step.images = uploadedImages;
      } else if (typeof step.images === "string") {
        // Nếu chỉ có 1 ảnh string
        step.images = [await uploadIfBase64(step.images, "recipes/steps")];
      }
      return step;
    });

    // Đợi tất cả steps upload xong
    await Promise.all(uploadPromises);
  }

  try {
    // Cập nhật recipe
    const updatedRecipe = await Recipe.findByIdAndUpdate(id, data, { new: true })
      .populate("ingredients", "name")
      .populate("tags", "name")
      .populate("cuisine", "name")
      .populate("category", "name");

    const totalTime = Date.now() - startTime;
    console.log(`[Update Recipe] ✅ Recipe updated successfully in ${totalTime}ms`);

    // 🔔 Phát hiện loại thay đổi và gửi thông báo
    let updateType = 'GENERAL';
    let updateDetails = 'Công thức đã được cập nhật';

    // Kiểm tra nếu có video mới
    if (data.video && data.video !== oldRecipe.video) {
      updateType = 'VIDEO';
      updateDetails = 'Video hướng dẫn mới đã được thêm';
    }
    // Kiểm tra nếu thay đổi nguyên liệu
    else if (data.ingredients && JSON.stringify(data.ingredients) !== JSON.stringify(oldRecipe.ingredients)) {
      updateType = 'INGREDIENTS';
      updateDetails = 'Nguyên liệu đã được cập nhật';
    }

    // Gửi thông báo cho users đã favorite (không chờ)
    notifyRecipeUpdate(
      id,
      updatedRecipe.name,
      updatedRecipe.image,
      updateType,
      updateDetails
    ).catch(err => {
      console.error('[Update Recipe] Failed to send notification:', err.message);
    });

    // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục (không chờ)
    notifySearchService().catch(err => 
      console.error('[Update Recipe] Failed to notify search service:', err.message)
    );

    return updatedRecipe;
  } catch (error) {
    console.error(`[Update Recipe] ❌ Failed to update recipe:`, error.message);
    if (error.code === 11000) {
      throw new Error(`Recipe "${data.name}" already exists`);
    }
    throw error;
  }
}

async function deleteRecipe(id) {
  const deleted = await Recipe.findByIdAndDelete(id);

  // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục
  await notifySearchService();
  return deleted;
}

async function updateRecipeRating(id, rate, numberOfRate) {
  return await Recipe.findByIdAndUpdate(
    id,
    { 
      rate: Number(rate),
      numberOfRate: Number(numberOfRate)
    },
    { new: true }
  );
}

async function getTopRatedRecipes(limit = 5) {
  return await Recipe.find()
    .select("-instructions") // ⚡ Loại bỏ instructions để giảm tải
    .sort({ rate: -1, numberOfRate: -1 }) // Sắp xếp theo rating giảm dần, nếu bằng nhau thì theo số lượng đánh giá
    .limit(limit)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function getNewestRecipes(limit = 10) {
  return await Recipe.find()
    .select("-instructions") // ⚡ Loại bỏ instructions để giảm tải
    .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo giảm dần (mới nhất trước)
    .limit(limit)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function getPopularRecipes(limit = 10) {
  return await Recipe.find()
    .select("-instructions") // ⚡ Loại bỏ instructions để giảm tải
    .sort({ numberOfRate: -1, rate: -1 }) // Sắp xếp theo số lượt đánh giá giảm dần, nếu bằng nhau thì ưu tiên rating cao hơn
    .limit(limit)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function getTrendingRecipes(limit = 5) {
  const FAVORITE_SERVICE_URL = process.env.FAVORITE_SERVICE_URL || 'http://favorite-service:5006';
  const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://review-service:5007';

  try {
    // Lấy tất cả recipes
    const allRecipes = await Recipe.find()
      .select("-instructions") // ⚡ Loại bỏ instructions để giảm tải
      .populate("ingredients", "name")
      .populate("tags", "name")
      .populate("cuisine", "name")
      .populate("category", "name")
      .lean();

    // Tính điểm trending cho mỗi recipe
    const recipesWithScore = await Promise.all(
      allRecipes.map(async (recipe) => {
        let score = 0;
        const recipeId = recipe._id.toString();

        try {
          // Lấy số lượt favorite
          const favoriteResponse = await axios.get(
            `${FAVORITE_SERVICE_URL}/api/favorites/recipe/${recipeId}/count`
          );
          const favoriteCount = favoriteResponse.data.count || 0;
          score += favoriteCount * 3; // Favorite có trọng số 3

          // Lấy số lượng comment và thông tin likes
          const commentResponse = await axios.get(
            `${REVIEW_SERVICE_URL}/api/comments/recipe/${recipeId}/count`
          );
          const commentCount = commentResponse.data.count || 0;
          score += commentCount * 2; // Comment có trọng số 2

          // Lấy chi tiết comments để tính likes và replies
          const commentsDetailResponse = await axios.get(
            `${REVIEW_SERVICE_URL}/api/comments/recipe/${recipeId}?limit=100`
          );
          
          const comments = commentsDetailResponse.data.comments || [];
          let totalLikes = 0;
          let totalReplies = 0;
          
          comments.forEach(comment => {
            totalLikes += comment.likes || 0;
            totalReplies += (comment.replies && comment.replies.length) || 0;
          });

          score += totalLikes * 1; // Like có trọng số 1
          score += totalReplies * 1.5; // Reply có trọng số 1.5

          return {
            _id: recipe._id,
            name: recipe.name,
            image: recipe.image,
            rate: recipe.rate,
            numberOfRate: recipe.numberOfRate,
            trendingScore: score,
            stats: {
              favoriteCount,
              commentCount,
              totalLikes,
              totalReplies
            }
          };
        } catch (error) {
          console.error(`Error fetching stats for recipe ${recipeId}:`, error.message);
          return {
            _id: recipe._id,
            name: recipe.name,
            image: recipe.image,
            rate: recipe.rate,
            numberOfRate: recipe.numberOfRate,
            trendingScore: 0,
            stats: {
              favoriteCount: 0,
              commentCount: 0,
              totalLikes: 0,
              totalReplies: 0
            }
          };
        }
      })
    );

    // Sắp xếp theo điểm trending và lấy top
    const trendingRecipes = recipesWithScore
      .sort((a, b) => b.trendingScore - a.trendingScore)
      .slice(0, limit);

    return trendingRecipes;
  } catch (error) {
    console.error('Error in getTrendingRecipes:', error.message);
    throw error;
  }
}

// 🔔 Hàm gửi thông báo cập nhật recipe
async function notifyRecipeUpdate(recipeId, recipeName, recipeImage, updateType, updateDetails) {
  try {
    await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/recipe-update`, {
      recipeId,
      recipeName,
      recipeImage,
      updateType,
      updateDetails
    });
    console.log(`✅ Sent recipe update notification for: ${recipeName}`);
  } catch (err) {
    console.error('❌ Failed to send recipe update notification:', err.message);
    // Không throw error để không ảnh hưởng đến quá trình update
  }
}

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
  updateRecipeRating,
  getTopRatedRecipes,
  getNewestRecipes,
  getPopularRecipes,
  getTrendingRecipes,
};
