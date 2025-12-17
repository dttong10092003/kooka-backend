const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const recipeRoutes = require("./routes/recipeRoutes");
const typeRoutes = require("./routes/ingredientTypeRoutes");
const ingredientRoutes = require("./routes/ingredientRoutes");
const cuisineRoutes = require("./routes/cuisineRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const tagRoutes = require("./routes/tagRoutes");
const submissionRoutes = require("./routes/submissionRoutes");

dotenv.config();
const app = express();

app.use(
  cors({
    origin: ["http://localhost:4000", "https://kooka-web.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json({ limit: "100mb" }));

// Routes
app.use("/api/recipes", recipeRoutes);
app.use("/api/submissions", submissionRoutes); // Đề xuất công thức
app.use("/api/ingredient-types", typeRoutes);
app.use("/api/ingredients", ingredientRoutes);
app.use("/api/cuisines", cuisineRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Ping endpoint for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Service is alive!');
});

// Start server
const PORT = process.env.PORT || 5000;

(async () => {
  try {
    await connectDB(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`🚀 recipe-service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start service:", err);
    process.exit(1);
  }
})();
