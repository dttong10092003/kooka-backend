const cron = require('node-cron');
const { autoUpdateMealPlanStatus } = require('./autoUpdateMealPlanStatus');

/**
 * 🕐 SETUP CRON JOBS CHO MEAL PLAN SERVICE
 * 
 * Cron Expression: "0 0 * * *"
 * - 0: Phút (0 = phút thứ 0)
 * - 0: Giờ (0 = 00:00 sáng)
 * - *: Ngày trong tháng (mọi ngày)
 * - *: Tháng (mọi tháng)
 * - *: Ngày trong tuần (mọi ngày)
 * 
 * → Chạy mỗi ngày lúc 00:00 (nửa đêm)
 */
const startCronJobs = () => {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('⏰ KHỞI ĐỘNG CRON JOBS - MEAL PLAN SERVICE');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 🤖 Job 1: Tự động cập nhật status meal plans
  // Chạy mỗi ngày lúc 00:00 (nửa đêm)
  const updateStatusJob = cron.schedule('0 0 * * *', async () => {
    console.log('\n🔔 [CRON] Trigger: Auto-update meal plan status');
    await autoUpdateMealPlanStatus();
  });

  console.log('✅ Job #1: Auto-update meal plan status');
  console.log('   ⏰ Schedule: Mỗi ngày lúc 00:00 (nửa đêm)');
  console.log('   📝 Cron: "0 0 * * *"');
  
  // 🧪 CHẠY NGAY KHI KHỞI ĐỘNG để đảm bảo update ngay khi deploy
  console.log('\n🧪 [INIT] Chạy job ngay lập tức khi khởi động...');
  autoUpdateMealPlanStatus().catch(err => {
    console.error('❌ [INIT] Lỗi khi chạy auto-update:', err.message);
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return {
    updateStatusJob
  };
};

/**
 * Dừng tất cả cron jobs (khi shutdown server)
 */
const stopCronJobs = (jobs) => {
  console.log('\n⏸️  Đang dừng cron jobs...');
  if (jobs.updateStatusJob) {
    jobs.updateStatusJob.stop();
    console.log('✅ Đã dừng: updateStatusJob');
  }
  console.log('');
};

module.exports = { startCronJobs, stopCronJobs };
