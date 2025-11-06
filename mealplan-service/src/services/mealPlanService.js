const MealPlan = require("../models/MealPlan");
const dayjs = require("dayjs");
const minMax = require("dayjs/plugin/minMax");
dayjs.extend(minMax);

function isStartDateConflict(newStart, existingStart) {
  const existing = dayjs(existingStart);
  const forbiddenStart = existing.subtract(6, "day");
  const forbiddenEnd = existing.add(6, "day");

  return (
    (newStart.isSame(forbiddenStart, "day") ||
      newStart.isAfter(forbiddenStart, "day")) &&
    (newStart.isSame(forbiddenEnd, "day") ||
      newStart.isBefore(forbiddenEnd, "day"))
  );
}

// Tạo mealplan mới
const createMealPlan = async (data) => {
  const { plans, userId, startDate: providedStartDate } = data;

  if (!plans || plans.length === 0) {
    throw new Error("Danh sách plans không được để trống");
  }

  // Lấy ngày nhỏ nhất và lớn nhất
  const allDates = plans.map((p) => dayjs(p.date));
  const minDate = dayjs.min(allDates);
  const endDate = dayjs.max(allDates);

  const startDate = providedStartDate ? dayjs(providedStartDate) : minDate;

  if (!startDate.isValid()) {
    throw new Error("Ngày bắt đầu không hợp lệ");
  }

  if (startDate.isAfter(minDate)) {
    throw new Error(
      `Ngày bắt đầu (${startDate.format(
        "DD/MM/YYYY"
      )}) không thể sau ngày sớm nhất trong kế hoạch (${minDate.format(
        "DD/MM/YYYY"
      )}).`
    );
  }

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

  const existingPlans = await MealPlan.find({ userId });
  for (const existing of existingPlans) {
    const existingStart = dayjs(existing.startDate);
    if (isStartDateConflict(startDate, existingStart)) {
      throw new Error(
        `Ngày bắt đầu (${startDate.format(
          "DD/MM/YYYY"
        )}) nằm trong vùng cấm (từ ${existingStart
          .subtract(6, "day")
          .format("DD/MM/YYYY")} đến ${existingStart
          .add(6, "day")
          .format("DD/MM/YYYY")}) của meal plan bắt đầu ${existingStart.format(
          "DD/MM/YYYY"
        )}.`
      );
    }
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

  const currentStartDate = dayjs(existingPlan.startDate);
  const allDates = plans.map((p) => dayjs(p.date));
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
  existingPlan.startDate = currentStartDate.toDate();
  existingPlan.endDate = endDate.toDate();

  const updatedPlan = await existingPlan.save();
  return updatedPlan;
};

// Xóa mealplan
const deleteMealPlan = async (id) => {
  return await MealPlan.findByIdAndDelete(id);
};

module.exports = {
  createMealPlan,
  getMealPlansByUser,
  updateMealPlan,
  deleteMealPlan,
};
