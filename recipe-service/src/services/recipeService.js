const Recipe = require("../models/Recipe");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { parseBase64 } = require("../utils/parseBase64");

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

  // Upload ảnh trong tungg bước nếu là base64
  if (Array.isArray(data.instructions)) {
    for (let i = 0; i < data.instructions.length; i++) {
      const step = data.instructions[i];
      step.image = await uploadIfBase64(step.image, "recipes/steps");
    }
  }

  const recipe = new Recipe(data);
  return await recipe.save();
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
      step.image = await uploadIfBase64(step.image, "recipes/steps");
    }
  }

  // Cập nhật recipe
  const updatedRecipe = await Recipe.findByIdAndUpdate(id, data, { new: true })
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");

  return updatedRecipe;
}

async function deleteRecipe(id) {
  return await Recipe.findByIdAndDelete(id);
}

module.exports = {
  getAllRecipes,
  getRecipeById,
  createRecipe,
  updateRecipe,
  deleteRecipe,
};
