const ingredientService = require("../services/ingredientService");

exports.getIngredients = async (req, res) => {
  try {
    const ingredients = await ingredientService.getAllIngredients();
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientService.getIngredientById(req.params.id);
    if (!ingredient)
      return res.status(404).json({ message: "Ingredient not found" });
    res.json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientService.createIngredient(req.body);
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientService.updateIngredient(
      req.params.id,
      req.body
    );
    if (!ingredient)
      return res.status(404).json({ message: "Ingredient not found" });
    res.json(ingredient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteIngredient = async (req, res) => {
  try {
    const ingredient = await ingredientService.deleteIngredient(req.params.id);
    if (!ingredient)
      return res.status(404).json({ message: "Ingredient not found" });
    res.json({ message: "Ingredient deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getIngredientsByTypeId = async (req, res) => {
  try {
    const { typeId } = req.params;
    const ingredients = await ingredientService.getIngredientsByTypeId(typeId);
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
