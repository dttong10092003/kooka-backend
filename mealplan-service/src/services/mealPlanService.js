const MealPlan = require("../models/MealPlan");
const dayjs = require("dayjs");
const minMax = require("dayjs/plugin/minMax");
dayjs.extend(minMax);

// Tạo mealplan mới
const createMealPlan = async (data) => {
  const { plans, userId } = data;

  if (!plans || plans.length === 0) {
    throw new Error("Danh sách plans không được để trống");
  }

  // Lấy ngày nhỏ nhất và lớn nhất
  const allDates = plans.map((p) => dayjs(p.date));
  const startDate = dayjs.min(allDates);
  const endDate = dayjs.max(allDates);

  // 1️⃣ Kiểm tra nếu người dùng có 3 mealplan chưa hoàn thành
  const incompletePlans = await MealPlan.find({
    userId,
    status: { $ne: "completed" },
  });

  if (incompletePlans.length >= 3) {
    throw new Error(
      "Bạn đã có 3 meal plan chưa hoàn thành. Vui lòng hoàn thành hoặc xóa bớt."
    );
  }

  // 2️⃣ Kiểm tra trùng ngày với mealplan khác (chưa hoàn thành)
  const selectedDates = plans.map((p) => dayjs(p.date).toDate());

  const conflictPlans = await MealPlan.find({
    userId,
    status: { $ne: "completed" },
    "plans.date": { $in: selectedDates },
  });

  if (conflictPlans.length > 0) {
    throw new Error(
      "Một hoặc nhiều ngày bạn chọn đã nằm trong meal plan khác của bạn."
    );
  }

  // 3️⃣ Tạo mealplan mới
  const mealPlan = await MealPlan.create({
    userId,
    startDate: startDate.toDate(),
    endDate: endDate.toDate(),
    plans,
    status: "pending",
  });

  return mealPlan;
};

// Lấy tất cả mealplan của 1 user
const getMealPlansByUser = async (userId) => {
  return await MealPlan.find({ userId }).sort({ startDate: 1 });
};

// Cập nhật 1 mealplan (ví dụ thay đổi món hoặc ngày)
const updateMealPlan = async (id, data) => {
  const { plans, userId } = data;

  // Kiểm tra mealplan tồn tại
  const existingPlan = await MealPlan.findById(id);
  if (!existingPlan) {
    throw new Error("MealPlan không tồn tại");
  }

  if (!plans || plans.length === 0) {
    throw new Error("Danh sách plans không được để trống");
  }

  // Lấy ngày nhỏ nhất và lớn nhất trong kế hoạch mới
  const allDates = plans.map((p) => dayjs(p.date));
  const startDate = dayjs.min(allDates);
  const endDate = dayjs.max(allDates);

  // 1️⃣ Kiểm tra xem userId có đúng với mealplan đang chỉnh không
  if (userId && userId !== existingPlan.userId) {
    throw new Error("Bạn không có quyền chỉnh sửa meal plan này");
  }

  // 2️⃣ Kiểm tra nếu có trùng ngày với mealplan khác (chưa hoàn thành)
  const selectedDates = plans.map((p) => dayjs(p.date).toDate());

  const conflictPlans = await MealPlan.find({
    _id: { $ne: id }, // loại bỏ chính nó
    userId: existingPlan.userId,
    status: { $ne: "completed" },
    "plans.date": { $in: selectedDates },
  });

  if (conflictPlans.length > 0) {
    throw new Error(
      "Một hoặc nhiều ngày trong kế hoạch mới đã nằm trong meal plan khác của bạn."
    );
  }

  // 3️⃣ Cập nhật dữ liệu
  existingPlan.plans = plans;
  existingPlan.startDate = startDate.toDate();
  existingPlan.endDate = endDate.toDate();

  const updatedPlan = await existingPlan.save();
  return updatedPlan;
};

// Xóa mealplan
const deleteMealPlan = async (id) => {
  return await MealPlan.findByIdAndDelete(id);
};

const updateMealPlanStatus = async (id, status) => {
  const mealPlan = await MealPlan.findById(id);
  if (!mealPlan) {
    throw new Error("MealPlan không tồn tại");
  }

  if (!["pending", "completed"].includes(status)) {
    throw new Error("Trạng thái không hợp lệ");
  }

  // Nếu status không thay đổi thì trả về luôn
  if (mealPlan.status === status) {
    return mealPlan;
  }

  // Cập nhật trạng thái
  mealPlan.status = status;
  await mealPlan.save();

  // Nếu chuyển sang 'completed' --> kiểm tra và xóa completed cũ (theo endDate)
  if (status === "completed") {
    // Lấy tất cả completed của user, sắp xếp theo endDate tăng dần, createdAt tăng dần (cũ nhất đầu)
    const completedPlans = await MealPlan.find({
      userId: mealPlan.userId,
      status: "completed",
    }).sort({ endDate: 1, createdAt: 1 });

    // Nếu vượt quá 2 bản ghi completed, xóa những cái cũ nhất (theo endDate)
    const excess = completedPlans.length - 2;
    if (excess > 0) {
      // Xóa 'excess' bản ghi đầu tiên trong completedPlans
      const toDelete = completedPlans.slice(0, excess);
      const deleteIds = toDelete.map((p) => p._id);
      await MealPlan.deleteMany({ _id: { $in: deleteIds } });
    }
  }

  return mealPlan;
};

module.exports = {
  createMealPlan,
  getMealPlansByUser,
  updateMealPlan,
  deleteMealPlan,
  updateMealPlanStatus,
};
