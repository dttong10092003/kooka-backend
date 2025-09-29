const authService = require("../services/authService");
const User = require("../models/user");
const axios = require("axios");

// ===== Cấu hình user-service URL =====
const USER_SERVICE_URLS = [
  "http://user-service:5002",  // cho Docker Compose
  "http://localhost:5002",     // cho local
];

// Hàm gọi user-service (thử nhiều URL)
async function callUserService(path, data) {
  console.log(`🔄 Calling user-service: ${path} with data:`, data);
  for (const baseUrl of USER_SERVICE_URLS) {
    try {
      console.log(`🌐 Trying ${baseUrl}${path}...`);
      const response = await axios.post(`${baseUrl}${path}`, data);
      console.log(`✅ Success from ${baseUrl}${path}:`, response.status);
      return response;
    } catch (err) {
      console.error(`❌ Failed ${baseUrl}${path}:`, err.response?.status || err.message);
    }
  }
  throw new Error("Không thể kết nối user-service ở cả Docker lẫn Local");
}

// ===== Đăng ký =====
exports.registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check email trùng
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Email already exists" });

    // Tạo user trong auth-service
    const user = await authService.createUser({ firstName, lastName, email, password });
    const token = authService.generateToken(user);

    // Gọi user-service để tạo profile
    try {
      await callUserService("/api/user/profile", {
        userId: user._id,
        firstName,
        lastName,
      });
    } catch (err) {
      console.error("❌ Lỗi khi tạo profile ở user-service:", err.message);
    }

    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(201).json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ===== Đăng nhập =====
exports.loginUser = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const user = await authService.findUserByUsernameOrEmail(usernameOrEmail);
    if (!user) return res.status(404).json({ message: "User not found" });

    const valid = await authService.comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ message: "Invalid credentials" });

    const token = authService.generateToken(user);
    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== Google login callback =====
exports.googleLogin = async (req, res) => {
  try {
    if (!req.user) return res.status(400).json({ message: "Google login failed" });
    const token = authService.generateToken(req.user);

    // Gọi user-service để tạo profile nếu chưa có
    try {
      await callUserService("/api/user/profile", {
        userId: req.user._id,
        firstName: req.user.firstName || req.user.username,
        lastName: req.user.lastName || "",
      });
    } catch (err) {
      console.error("Lỗi khi tạo profile ở user-service:", err.message);
    }

    // Trả kết quả cho frontend
    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = req.user.toObject();
    res.json({ token, user: userWithoutPassword });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ===== Google success (test route) =====
exports.googleSuccess = (req, res) => {
  res.send("Google login success!");
};

// ===== Đổi mật khẩu =====
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await authService.comparePassword(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    const updated = await authService.updatePassword(req.user.id, newPassword);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ===== Tạo admin =====
exports.createAdmin = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden" });

    const { username, password } = req.body;
    const admin = await authService.createAdminUser(username, password);

    // Admin cũng cần profile bên user-service
    try {
      await callUserService("/api/user/profile", {
        userId: admin._id,
        firstName: "Admin",
        lastName: "",
      });
    } catch (err) {
      console.error("Lỗi khi tạo profile cho admin ở user-service:", err.message);
    }

    // Loại bỏ password khỏi response
    const { password: _, ...adminWithoutPassword } = admin.toObject();
    res.status(201).json(adminWithoutPassword);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
