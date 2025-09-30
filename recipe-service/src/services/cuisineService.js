const Cuisine = require("../models/Cuisine");

async function getAllCuisines() {
  return await Cuisine.find();
}

async function getCuisineById(id) {
  return await Cuisine.findById(id);
}

async function createCuisine(data) {
  const cuisine = new Cuisine(data);
  return await cuisine.save();
}

async function updateCuisine(id, data) {
  return await Cuisine.findByIdAndUpdate(id, data, { new: true });
}

async function deleteCuisine(id) {
  return await Cuisine.findByIdAndDelete(id);
}

module.exports = {
  getAllCuisines,
  getCuisineById,
  createCuisine,
  updateCuisine,
  deleteCuisine,
};
