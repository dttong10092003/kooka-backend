const express = require("express");
const router = express.Router();
const mealPlanController = require("../controllers/mealPlanController");

router.post("/", mealPlanController.createMealPlan);
router.get("/:userId", mealPlanController.getMealPlansByUser);
router.patch("/:id", mealPlanController.updateMealPlan);
router.delete("/:id", mealPlanController.deleteMealPlan);
router.patch("/:id/status", mealPlanController.updateMealPlanStatus);

module.exports = router;
