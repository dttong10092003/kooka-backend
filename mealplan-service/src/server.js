const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const mealPlanRoutes = require("./routes/mealPlanRoute");
const { startCronJobs, stopCronJobs } = require("./jobs/cronScheduler");

dotenv.config();
const app = express();

// 🎯 Biến global để lưu cron jobs
let cronJobs = null;

app.use(
  cors({
    origin: ["http://localhost:4000", "https://kooka-web.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Routes
app.use("/api/mealplans", mealPlanRoutes);

// Ping endpoint for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Service is alive!');
});

const PORT = process.env.PORT || 5009;

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`🚀 mealplan-service running on port ${PORT}`);
      
      // 🤖 Khởi động cron jobs sau khi server start thành công
      cronJobs = startCronJobs();
    });
  } catch (err) {
    console.error("❌ Failed to start service:", err);
    process.exit(1);
  }
})();

// 🛑 Graceful shutdown: Dừng cron jobs khi tắt server
process.on('SIGTERM', () => {
  console.log('\n🛑 SIGTERM signal received: Closing HTTP server');
  if (cronJobs) {
    stopCronJobs(cronJobs);
  }
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT signal received: Closing HTTP server');
  if (cronJobs) {
    stopCronJobs(cronJobs);
  }
  process.exit(0);
});
