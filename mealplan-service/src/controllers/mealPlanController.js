const mealPlanService = require("../services/mealPlanService");

// Tạo mealplan
exports.createMealPlan = async (req, res) => {
  try {
    const { userId, plans } = req.body;
    const mealPlan = await mealPlanService.createMealPlan({ userId, plans });
    res.status(201).json(mealPlan);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả mealplan theo user
exports.getMealPlansByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await mealPlanService.getMealPlansByUser(userId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cập nhật mealplan
exports.updateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const result = await mealPlanService.updateMealPlan(id, data);
    if (!result) return res.status(404).json({ message: "MealPlan not found" });
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Xóa mealplan
exports.deleteMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await mealPlanService.deleteMealPlan(id);
    if (!result) return res.status(404).json({ message: "MealPlan not found" });
    res.status(200).json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateMealPlanStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await mealPlanService.updateMealPlanStatus(id, status);

    res.status(200).json({
      message: `Cập nhật trạng thái meal plan thành công`,
      data: result,
    });
  } catch (err) {
    console.error("Lỗi khi cập nhật trạng thái:", err);
    res.status(400).json({ message: err.message });
  }
};
