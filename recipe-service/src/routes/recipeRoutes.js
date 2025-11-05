const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recipeController");

router.get("/", recipeController.getRecipes);
router.get("/top-rated", recipeController.getTopRatedRecipes);
router.get("/newest", recipeController.getNewestRecipes);
router.get("/popular", recipeController.getPopularRecipes);
router.get("/trending", recipeController.getTrendingRecipes);
router.get("/:id", recipeController.getRecipe);
router.post("/", recipeController.createRecipe);
router.put("/:id", recipeController.updateRecipe);
router.patch("/:id/rating", recipeController.updateRecipeRating);
router.delete("/:id", recipeController.deleteRecipe);

module.exports = router;
