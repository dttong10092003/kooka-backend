const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const recipeRoutes = require("./routes/recipeRoutes");

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use("/api/recipes", recipeRoutes);

// Health check
app.get("/health", (req, res) => res.json({ status: "ok" }));

// Start server
const PORT = process.env.PORT || 3000;

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
