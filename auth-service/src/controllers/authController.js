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
    
    // Trả HTML page để post message về parent window
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google Login Success</title>
    </head>
    <body>
        <script>
            const data = {
                token: "${token}",
                user: ${JSON.stringify(userWithoutPassword)}
            };
            
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GOOGLE_AUTH_SUCCESS',
                    payload: data
                }, "http://localhost:4000");
                window.close();
            } else {
                // Fallback: redirect to frontend with token in URL
                window.location.href = "http://localhost:4000/auth/google/callback?token=${token}";
            }
        </script>
    </body>
    </html>`;
    
    res.send(html);
  } catch (err) {
    // Trả HTML error page
    const errorHtml = `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Google Login Error</title>
    </head>
    <body>
        <script>
            if (window.opener) {
                window.opener.postMessage({
                    type: 'GOOGLE_AUTH_ERROR',
                    error: "${err.message}"
                }, "http://localhost:4000");
                window.close();
            } else {
                window.location.href = "http://localhost:4000/login?error=google_auth_failed";
            }
        </script>
    </body>
    </html>`;
    
    res.send(errorHtml);
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
