const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const profileRoutes = require("./routes/profileRoutes");

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use("/profiles", profileRoutes);

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ User-Service MongoDB connected");
    app.listen(5002, () => console.log("🚀 User-Service running on port 5002"));
  })
  .catch((err) => console.error(err));
