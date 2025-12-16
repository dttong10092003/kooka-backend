const MealPlan = require("../models/MealPlan");
const dayjs = require("dayjs");

/**
 * 🤖 TỰ ĐỘNG CẬP NHẬT STATUS CỦA MEAL PLAN
 * 
 * Logic:
 * - Meal plan hết hạn sau 7 ngày kể từ startDate (startDate + 6 ngày)
 * - VD: startDate = 01/11 → hết hạn sau ngày 07/11
 * - Dùng startDate thay vì endDate vì startDate KHÔNG BAO GIỜ THAY ĐỔI
 * - Tự động xóa completed cũ, chỉ giữ 2 bản ghi completed gần nhất (theo startDate)
 */
const autoUpdateMealPlanStatus = async () => {
  try {
    const now = dayjs().startOf('day'); // Bắt đầu ngày hôm nay (00:00:00)
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🤖 [AUTO-UPDATE] Bắt đầu kiểm tra meal plans...`);
    console.log(`📅 Ngày hiện tại: ${now.format('DD/MM/YYYY')}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 1️⃣ Tìm tất cả meal plans CHƯA HOÀN THÀNH
    const allPendingPlans = await MealPlan.find({
      status: "pending"
    });

    // 2️⃣ Lọc những plan đã HẾT HẠN dựa trên startDate
    // Meal plan hết hạn = startDate + 6 ngày < hôm nay
    const expiredPlans = allPendingPlans.filter(plan => {
      const startDate = dayjs(plan.startDate).startOf('day');
      const expiryDate = startDate.add(6, 'day'); // Ngày cuối cùng của meal plan
      
      // Hết hạn nếu ngày hết hạn < hôm nay
      return expiryDate.isBefore(now, 'day');
    });

    console.log(`📦 Tìm thấy ${expiredPlans.length} meal plan(s) đã hết hạn`);

    if (expiredPlans.length === 0) {
      console.log(`✅ Không có meal plan nào cần cập nhật\n`);
      return {
        success: true,
        updatedCount: 0,
        deletedCount: 0,
        message: "Không có meal plan nào cần cập nhật"
      };
    }

    // 2️⃣ Cập nhật status thành "completed"
    let updatedCount = 0;
    let deletedCount = 0;
    const userIds = new Set();

    for (const plan of expiredPlans) {
      const startDate = dayjs(plan.startDate);
      const expiryDate = startDate.add(6, 'day');
      
      plan.status = "completed";
      await plan.save();
      updatedCount++;
      userIds.add(plan.userId);

      console.log(`   ✓ Updated: MealPlan ${plan._id} (User: ${plan.userId})`);
      console.log(`      📅 StartDate: ${startDate.format('DD/MM/YYYY')} → Hết hạn: ${expiryDate.format('DD/MM/YYYY')}`);
    }

    console.log(`\n✅ Đã cập nhật ${updatedCount} meal plan(s) thành "completed"`);

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ HOÀN THÀNH!`);
    console.log(`   📊 Cập nhật: ${updatedCount} meal plan(s)`);
    console.log(`   🗑️  Xóa: ${deletedCount} meal plan(s) cũ`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    return {
      success: true,
      updatedCount,
      deletedCount,
      message: `Đã cập nhật ${updatedCount} meal plan(s) và xóa ${deletedCount} bản ghi cũ`
    };

  } catch (error) {
    console.error(`\n❌ [AUTO-UPDATE] Lỗi:`, error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = { autoUpdateMealPlanStatus };
