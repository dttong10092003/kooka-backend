const express = require("express");
const router = express.Router();
const ingredientController = require("../controllers/ingredientController");

router.get("/", ingredientController.getIngredients);
router.get("/type/:typeId", ingredientController.getIngredientsByTypeId);
router.get("/:id", ingredientController.getIngredient);
router.post("/", ingredientController.createIngredient);
router.put("/:id", ingredientController.updateIngredient);
router.delete("/:id", ingredientController.deleteIngredient);


module.exports = router;
