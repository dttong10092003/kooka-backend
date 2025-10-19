const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const mealPlanRoutes = require("./routes/mealPlanRoute");

dotenv.config();
const app = express();

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

const PORT = process.env.PORT || 5008;

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`🚀 mealplan-service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start service:", err);
    process.exit(1);
  }
})();
