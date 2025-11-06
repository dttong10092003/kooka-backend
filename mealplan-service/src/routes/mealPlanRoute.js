const express = require("express");
const router = express.Router();
const mealPlanController = require("../controllers/mealPlanController");

router.post("/", mealPlanController.createMealPlan);
router.get("/:userId", mealPlanController.getMealPlansByUser);
router.patch("/:id", mealPlanController.updateMealPlan);
router.delete("/:id", mealPlanController.deleteMealPlan);

// 🤖 Admin endpoint: Trigger auto-update manually (để test)
router.post("/admin/auto-update-status", mealPlanController.triggerAutoUpdateStatus);

module.exports = router;
