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

  const recipe = new Recipe(data);
  const saved = await recipe.save();

  // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục
  await notifySearchService();

  return saved;
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

  // Cập nhật recipe
  const updatedRecipe = await Recipe.findByIdAndUpdate(id, data, { new: true })
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");

  // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục
  await notifySearchService();

  return updatedRecipe;
}

async function deleteRecipe(id) {
  const deleted = await Recipe.findByIdAndDelete(id);

  // Thông báo cho dịch vụ tìm kiếm để cập nhật chỉ mục
  await notifySearchService();
  return deleted;
}

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};
