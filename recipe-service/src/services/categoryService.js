const Category = require("../models/Category");

async function getAllCategories() {
  return await Category.find();
}

async function getCategoryById(id) {
  return await Category.findById(id);
}

async function createCategory(data) {
  const category = new Category(data);
  return await category.save();
}

async function updateCategory(id, data) {
  return await Category.findByIdAndUpdate(id, data, { new: true });
}

async function deleteCategory(id) {
  return await Category.findByIdAndDelete(id);
}

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
