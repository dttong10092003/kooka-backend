const express = require("express");
const router = express.Router();
const ingredientDetailsController = require("../controllers/ingredientDetailsController");

// Lấy ingredient details của recipe hoặc submission
router.get("/recipe/:recipeId", ingredientDetailsController.getIngredientDetailsByRecipeId);

module.exports = router;
