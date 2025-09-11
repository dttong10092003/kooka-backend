const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const authRoutes = require("./routes/authRoute");
const passport = require("./config/passport"); // import config passport

// Tạo super-admin mặc định
const bcrypt = require("bcryptjs");
const User = require("./models/user");

// Tạo admin mặc định nếu chưa có
const createDefaultAdmin = async () => {
  const existAdmin = await User.findOne({ username: "admin" });
  if (!existAdmin) {
    const hashedPassword = await bcrypt.hash("admin", 10);
    const newAdmin = new User({
      username: "admin",
      password: hashedPassword,
      isAdmin: true
    });
    await newAdmin.save();
    console.log("Default admin created: username=admin, password=admin");
  }
};


dotenv.config();
const app = express();

app.use(express.json());

// Khởi tạo passport
app.use(passport.initialize());

// connect mongo
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    await createDefaultAdmin(); // Tạo admin mặc định khi kết nối DB thành công
  })
  .catch(err => console.log(err));

// routes
app.use("/auth", authRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Auth service running on port ${PORT}`));
