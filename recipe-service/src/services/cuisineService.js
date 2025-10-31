const Cuisine = require("../models/Cuisine");

async function getAllCuisines() {
  return await Cuisine.find();
}

async function getCuisineById(id) {
  return await Cuisine.findById(id);
}

async function createCuisine(data) {
  try {
    const cuisine = new Cuisine(data);
    return await cuisine.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Cuisine "${data.name}" already exists`);
    }
    throw error;
  }
}

async function updateCuisine(id, data) {
  try {
    return await Cuisine.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Cuisine "${data.name}" already exists`);
    }
    throw error;
  }
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
