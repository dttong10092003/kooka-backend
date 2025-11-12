const authService = require("../services/authService");
const User = require("../models/user");
const axios = require("axios");

// ===== Cấu hình user-service URL =====
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:5002";

// Hàm gọi user-service
async function callUserService(path, data) {
  console.log(`🔄 Calling user-service: ${path} with data:`, data);
  try {
    console.log(`🌐 Trying ${USER_SERVICE_URL}${path}...`);
    const response = await axios.post(`${USER_SERVICE_URL}${path}`, data);
    console.log(`✅ Success from ${USER_SERVICE_URL}${path}:`, response.status);
    return response;
  } catch (err) {
    console.error(`❌ Failed ${USER_SERVICE_URL}${path}:`, err.response?.status || err.message);
    throw new Error("Không thể kết nối user-service");
  }
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
      const profileData = {
        userId: req.user._id,
        firstName: req.user.googleProfile?.firstName || req.user.username,
        lastName: req.user.googleProfile?.lastName || "",
        avatar: req.user.googleProfile?.profilePicture || null,
      };
      
      await callUserService("/api/user/profile", profileData);
    } catch (err) {
      console.error("Lỗi khi tạo profile ở user-service:", err.message);
    }

    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = req.user.toObject();
    
    // Redirect trực tiếp về frontend với token
    const userJson = encodeURIComponent(JSON.stringify(userWithoutPassword));
    const redirectUrl = `https://kooka-web.vercel.app/auth/google/callback?token=${token}&user=${userJson}`;
    
    res.redirect(redirectUrl);
  } catch (err) {
    // Redirect về frontend với error
    const errorUrl = `https://kooka-web.vercel.app/login?error=${encodeURIComponent(err.message)}`;
    res.redirect(errorUrl);
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

// ===== Forgot Password =====
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Vui lòng nhập email" });
    }

    const result = await authService.forgotPassword(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ===== Reset Password =====
exports.resetPassword = async (req, res) => {
  try {
    // Hỗ trợ cả 2 cách: token từ URL params hoặc từ body
    const token = req.params.token || req.body.token;
    const { newPassword } = req.body;
    
    if (!token || !newPassword) {
      return res.status(400).json({ message: "Token và mật khẩu mới là bắt buộc" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    const result = await authService.resetPassword(token, newPassword);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ===== Get User by ID (for other services) =====
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password'); // Exclude password
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
