const recipeService = require("../services/recipeService");

exports.getRecipes = async (req, res) => {
  try {
    const recipes = await recipeService.getAllRecipes();
    res.json(recipes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRecipe = async (req, res) => {
  try {
    const recipe = await recipeService.getRecipeById(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRecipe = async (req, res) => {
  try {
    const recipe = await recipeService.createRecipe(req.body);
    res.status(201).json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateRecipe = async (req, res) => {
  try {
    const recipe = await recipeService.updateRecipe(req.params.id, req.body);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteRecipe = async (req, res) => {
  try {
    const recipe = await recipeService.deleteRecipe(req.params.id);
    if (!recipe) return res.status(404).json({ message: "Recipe not found" });
    res.json({ message: "Recipe deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRecipeRating = async (req, res) => {
  try {
    const { rate, numberOfRate } = req.body;
    
    if (rate === undefined || numberOfRate === undefined) {
      return res.status(400).json({ 
        error: 'rate and numberOfRate are required' 
      });
    }

    const recipe = await recipeService.updateRecipeRating(
      req.params.id, 
      rate, 
      numberOfRate
    );
    
    if (!recipe) {
      return res.status(404).json({ message: "Recipe not found" });
    }
    
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
