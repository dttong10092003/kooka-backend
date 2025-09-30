const Recipe = require("../models/Recipe");

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

async function createRecipe(data) {
  const recipe = new Recipe(data);
  return await recipe.save();
}

async function updateRecipe(id, data) {
  return await Recipe.findByIdAndUpdate(id, data, { new: true })
    .populate("ingredients", "name")
    .populate("tags", "name")
    .populate("cuisine", "name")
    .populate("category", "name");
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
