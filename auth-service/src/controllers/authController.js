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
    const { email, password } = req.body;

    // Check email trùng
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Email already exists" });

    // Tạo user trong auth-service (chỉ lưu email, username, password, isAdmin)
    // User sẽ có isVerified = false và sẽ nhận email xác thực
    const user = await authService.createUser({ email, password });
    
    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = user.toObject();
    res.status(201).json({ 
      message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
      user: userWithoutPassword,
      needVerification: true
    });
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

    // Kiểm tra xác thực email (chỉ với tài khoản mới có field isVerified)
    // Tài khoản cũ không có field này sẽ được phép login (backward compatibility)
    if (user.isVerified === false) {
      return res.status(403).json({ 
        message: "Email chưa được xác thực. Vui lòng kiểm tra email của bạn.",
        isVerified: false 
      });
    }

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

// ===== Google Login for Mobile (React Native) =====
exports.googleLoginMobile = async (req, res) => {
  try {
    const { idToken, email, googleId, firstName, lastName, avatar } = req.body;

    // Validate input
    if (!email || !googleId) {
      return res.status(400).json({ message: "Email và googleId là bắt buộc" });
    }

    // Tìm user theo googleId hoặc email
    let user = await User.findOne({
      $or: [{ googleId: googleId }, { email: email }]
    });

    if (user) {
      // User đã tồn tại - cập nhật googleId nếu chưa có
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Tạo user mới trong auth-service
      const username = await authService.generateUniqueUsername ? 
        await authService.generateUniqueUsername(email) : 
        email.split('@')[0];
      
      user = new User({
        googleId: googleId,
        username: username,
        email: email,
      });
      
      await user.save();

      // Tạo profile bên user-service
      try {
        await callUserService("/api/user/profile", {
          userId: user._id,
          firstName: firstName || username,
          lastName: lastName || "",
          avatar: avatar || null,
        });
      } catch (err) {
        console.error("❌ Lỗi khi tạo profile ở user-service:", err.message);
      }
    }

    // Generate JWT token
    const token = authService.generateToken(user);

    // Loại bỏ password khỏi response
    const { password: _, ...userWithoutPassword } = user.toObject();

    res.status(200).json({
      success: true,
      message: "Google login successful",
      token: token,
      user: userWithoutPassword
    });

  } catch (err) {
    console.error("❌ Google login mobile error:", err);
    res.status(500).json({ 
      success: false,
      message: err.message || "Google login failed" 
    });
  }
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

// ===== Tạo admin phụ =====
exports.createAdmin = async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Forbidden: Chỉ admin mới có quyền tạo admin phụ" });

    const { firstName, lastName, email, password } = req.body;

    // Validate input
    if (!firstName || !email || !password) {
      return res.status(400).json({ message: "firstName, email và password là bắt buộc" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự" });
    }

    // Check email trùng
    const exist = await User.findOne({ email });
    if (exist) return res.status(400).json({ message: "Email đã tồn tại" });

    // Tạo admin trong auth-service (chỉ lưu email, username, password, isAdmin)
    const admin = await authService.createAdminUser({ email, password });

    // Tạo profile bên user-service (lưu firstName, lastName)
    try {
      await callUserService("/api/user/profile", {
        userId: admin._id,
        firstName: firstName,
        lastName: lastName || "",
      });
    } catch (err) {
      console.error("Lỗi khi tạo profile cho admin ở user-service:", err.message);
      // Nếu tạo profile thất bại, xóa admin vừa tạo
      await User.findByIdAndDelete(admin._id);
      return res.status(500).json({ message: "Không thể tạo profile cho admin. Vui lòng thử lại." });
    }

    // Loại bỏ password khỏi response
    const { password: _, ...adminWithoutPassword } = admin.toObject();
    res.status(201).json({ 
      message: "Tạo admin phụ thành công",
      admin: adminWithoutPassword 
    });
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

// ===== Verify Email =====
exports.verifyEmail = async (req, res) => {
  try {
    // Hỗ trợ cả 3 cách: token từ URL params, query, hoặc body
    const token = req.params.token || req.query.token || req.body.token;
    const { firstName, lastName } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: "Token là bắt buộc" });
    }

    const result = await authService.verifyEmail(token, firstName, lastName);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ===== Resend Verification Email =====
exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email là bắt buộc" });
    }

    const result = await authService.resendVerificationEmail(email);
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
