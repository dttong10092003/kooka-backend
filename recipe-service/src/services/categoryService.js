const Category = require("../models/Category");

async function getAllCategories() {
  return await Category.find();
}

async function getCategoryById(id) {
  return await Category.findById(id);
}

async function createCategory(data) {
  try {
    const category = new Category(data);
    return await category.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Danh mục "${data.name}" đã tồn tại`);
    }
    throw error;
  }
}

async function updateCategory(id, data) {
  try {
    return await Category.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Danh mục "${data.name}" đã tồn tại`);
    }
    throw error;
  }
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
