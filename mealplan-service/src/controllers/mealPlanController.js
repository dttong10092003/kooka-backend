const mealPlanService = require("../services/mealPlanService");

// Tạo mealplan
exports.createMealPlan = async (req, res) => {
  try {
    const { userId, plans, startDate } = req.body;
    const mealPlan = await mealPlanService.createMealPlan({ userId, plans, startDate });
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

// 🤖 Trigger auto-update status manually (cho test/debug)
exports.triggerAutoUpdateStatus = async (req, res) => {
  try {
    const { autoUpdateMealPlanStatus } = require("../jobs/autoUpdateMealPlanStatus");
    
    console.log('\n🧪 [MANUAL TRIGGER] Admin đang test auto-update...\n');
    const result = await autoUpdateMealPlanStatus();
    
    res.status(200).json({
      message: "Đã chạy auto-update thành công",
      result
    });
  } catch (err) {
    console.error("Lỗi khi trigger auto-update:", err);
    res.status(500).json({ message: err.message });
  }
};
