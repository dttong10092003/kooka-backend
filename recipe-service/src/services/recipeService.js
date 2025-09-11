const Recipe = require("../models/Recipe");

// Tất cả logic DB sẽ nằm ở đây
async function getAllRecipes() {
  return await Recipe.find();
}

async function getRecipeById(id) {
  return await Recipe.findById(id);
}

async function createRecipe(data) {
  const recipe = new Recipe(data);
  return await recipe.save();
}

async function updateRecipe(id, data) {
  return await Recipe.findByIdAndUpdate(id, data, { new: true });
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
