const express = require("express");
const router = express.Router();
const recipeController = require("../controllers/recipeController");

router.get("/", recipeController.getRecipes);
router.get("/:id", recipeController.getRecipe);
router.post("/", recipeController.createRecipe);
router.put("/:id", recipeController.updateRecipe);
router.patch("/:id/rating", recipeController.updateRecipeRating);
router.delete("/:id", recipeController.deleteRecipe);

module.exports = router;
