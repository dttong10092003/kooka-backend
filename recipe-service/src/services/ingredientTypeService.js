const IngredientType = require("../models/IngredientType");

async function getAllTypes() {
  return await IngredientType.find();
}

async function getTypeById(id) {
  return await IngredientType.findById(id);
}

async function createType(data) {
  try {
    const type = new IngredientType(data);
    return await type.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Ingredient Type "${data.name}" already exists`);
    }
    throw error;
  }
}

async function updateType(id, data) {
  try {
    return await IngredientType.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Ingredient Type "${data.name}" already exists`);
    }
    throw error;
  }
}

async function deleteType(id) {
  return await IngredientType.findByIdAndDelete(id);
}

module.exports = {
  getAllTypes,
  getTypeById,
  createType,
  updateType,
  deleteType,
};
