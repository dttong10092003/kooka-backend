const IngredientType = require("../models/IngredientType");

async function getAllTypes() {
  return await IngredientType.find();
}

async function getTypeById(id) {
  return await IngredientType.findById(id);
}

async function createType(data) {
  const type = new IngredientType(data);
  return await type.save();
}

async function updateType(id, data) {
  return await IngredientType.findByIdAndUpdate(id, data, { new: true });
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
