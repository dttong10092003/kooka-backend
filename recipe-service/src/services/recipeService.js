const Recipe = require("../models/Recipe");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { parseBase64 } = require("../utils/parseBase64");
const axios = require("axios");

const PYTHON_COOK_SERVICE_URL = process.env.PYTHON_COOK_SERVICE_URL;

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
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function getRecipeById(id) {
  return await Recipe.findById(id)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function uploadIfBase64(file, folder = "recipes") {
  if (!file) return null;
  if (typeof file !== "string") return file;

  // Nếu là base64 thì upload lên Cloudinary
  if (file.startsWith("data:")) {
    const { buffer, fakeFileName } = parseBase64(file);
    return await uploadToCloudinary(buffer, fakeFileName, folder);
  }

  // Nếu là link thì giữ nguyên
  return file;
}

async function createRecipe(data) {
  // Upload ảnh nếu là base64
  if (data.image) {
    data.image = await uploadIfBase64(data.image, "recipes");
  }

  // Upload video nếu là base64
  if (data.video) {
    data.video = await uploadIfBase64(data.video, "recipes");
  }

  // Upload ảnh trong từng bước nếu là base64
  if (Array.isArray(data.instructions)) {
    for (let i = 0; i < data.instructions.length; i++) {
      const step = data.instructions[i];

      // Nếu step.image là mảng thì upload từng ảnh
      if (Array.isArray(step.image)) {
        const uploadedImages = [];
        for (let j = 0; j < Math.min(step.image.length, 4); j++) {
          // Giới hạn 4 ảnh
          const img = step.image[j];
          uploadedImages.push(await uploadIfBase64(img, "recipes/steps"));
        }
        step.image = uploadedImages;
      } else if (typeof step.image === "string") {
        // Nếu chỉ có 1 ảnh string
        step.image = [await uploadIfBase64(step.image, "recipes/steps")];
      }
    }
  }

  try {
    const recipe = new Recipe(data);
    const saved = await recipe.save();

    // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục
    await notifySearchService();

    return saved;
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Recipe "${data.name}" already exists`);
    }
    throw error;
  }
}

async function updateRecipe(id, data) {
  // Upload ảnh chính nếu là base64
  if (data.image) {
    data.image = await uploadIfBase64(data.image, "recipes");
  }

  // Upload video nếu là base64
  if (data.video) {
    data.video = await uploadIfBase64(data.video, "recipes");
  }

  // Upload ảnh trong từng bước nếu là base64
  if (Array.isArray(data.instructions)) {
    for (let i = 0; i < data.instructions.length; i++) {
      const step = data.instructions[i];
 
      // Nếu step.images là mảng thì upload từng ảnh
      if (Array.isArray(step.images)) {
        const uploadedImages = [];
        for (let j = 0; j < Math.min(step.images.length, 4); j++) {
          // Giới hạn 4 ảnh
          const img = step.images[j];
          uploadedImages.push(await uploadIfBase64(img, "recipes/steps"));
        }
        step.images = uploadedImages;
      } else if (typeof step.images === "string") {
        // Nếu chỉ có 1 ảnh string
        step.images = [await uploadIfBase64(step.images, "recipes/steps")];
      }
    }
  }

  try {
    // Cập nhật recipe
    const updatedRecipe = await Recipe.findByIdAndUpdate(id, data, { new: true })
      .populate("ingredients", "name")
      .populate("tags", "name")
      .populate("cuisine", "name")
      .populate("category", "name");

    // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục
    await notifySearchService();

    return updatedRecipe;
  } catch (error) {
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
    .sort({ rate: -1, numberOfRate: -1 }) // Sắp xếp theo rating giảm dần, nếu bằng nhau thì theo số lượng đánh giá
    .limit(limit)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function getNewestRecipes(limit = 10) {
  return await Recipe.find()
    .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo giảm dần (mới nhất trước)
    .limit(limit)
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
}

async function getPopularRecipes(limit = 10) {
  return await Recipe.find()
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
