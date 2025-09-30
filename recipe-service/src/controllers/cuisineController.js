const cuisineService = require("../services/cuisineService");

exports.getCuisines = async (req, res) => {
  try {
    const cuisines = await cuisineService.getAllCuisines();
    res.json(cuisines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCuisine = async (req, res) => {
  try {
    const cuisine = await cuisineService.getCuisineById(req.params.id);
    if (!cuisine) return res.status(404).json({ message: "Cuisine not found" });
    res.json(cuisine);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createCuisine = async (req, res) => {
  try {
    const cuisine = await cuisineService.createCuisine(req.body);
    res.status(201).json(cuisine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateCuisine = async (req, res) => {
  try {
    const cuisine = await cuisineService.updateCuisine(req.params.id, req.body);
    if (!cuisine) return res.status(404).json({ message: "Cuisine not found" });
    res.json(cuisine);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteCuisine = async (req, res) => {
  try {
    const cuisine = await cuisineService.deleteCuisine(req.params.id);
    if (!cuisine) return res.status(404).json({ message: "Cuisine not found" });
    res.json({ message: "Cuisine deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
