const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const profileRoutes = require("./routes/profileRoutes");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" })); // Tăng limit để hỗ trợ upload ảnh base64
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Routes
app.use("/api/user/profile", profileRoutes);

// Ping endpoint for UptimeRobot
app.get('/ping', (req, res) => {
  res.status(200).send('Service is alive!');
});

// Kết nối MongoDB
mongoose
  .connect(process.env.MONGO_URI_USER)
  .then(() => {
    console.log("✅ User-Service MongoDB connected");
    app.listen(5002, () => console.log("🚀 User-Service running on port 5002"));
  })
  .catch((err) => console.error(err));
