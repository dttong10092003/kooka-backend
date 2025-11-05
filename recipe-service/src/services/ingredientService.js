const Ingredient = require("../models/Ingredient");

async function getAllIngredients() {
  return await Ingredient.find();
}

async function getIngredientById(id) {
  return await Ingredient.findById(id);
}

async function createIngredient(data) {
  try {
    const ingredient = new Ingredient(data);
    return await ingredient.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Ingredient "${data.name}" already exists`);
    }
    throw error;
  }
}

async function updateIngredient(id, data) {
  try {
    return await Ingredient.findByIdAndUpdate(id, data, { new: true }).populate("typeId", "name");
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Ingredient "${data.name}" already exists`);
    }
    throw error;
  }
}

async function deleteIngredient(id) {
  return await Ingredient.findByIdAndDelete(id);
}

async function getIngredientsByTypeId(typeId) {
  return await Ingredient.find({ typeId });
}

module.exports = { getAllIngredients, getIngredientById, createIngredient, updateIngredient, deleteIngredient, getIngredientsByTypeId };
