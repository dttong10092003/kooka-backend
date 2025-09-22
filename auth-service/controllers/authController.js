const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const generateUniqueUsername = async (email) => {
  let baseUsername = email.split("@")[0];
  let username = baseUsername;
  let counter = 1;

  // Lặp cho tới khi tìm username chưa tồn tại
  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  return username;
};
// Đăng ký
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Check confirm password
    if (password !== confirmPassword) {
      return res.status(400).json({
        code: "auth.passwordNotMatch"
      })
    }

    // Check email tồn tại
    const existUser = await User.findOne({ email });
    if (existUser) return res.status(400).json({
      code: "auth.emailExist"
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    // 👉 Tạo username unique từ email
    const username = await generateUniqueUsername(email);

    const newUser = new User({
      username,
      firstName,
      lastName,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    // Gọi sang user-service để tạo profile
    try {
      await axios.post("http://user-service:5002/profiles", {
        userId: newUser._id,
        firstName,
        lastName,
      });
    } catch (profileErr) {
      console.error("Error creating profile:", profileErr.message);
    }

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, email: newUser.email, isAdmin: newUser.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.status(201).json({
      message: "User registered successfully",
      token,
      user: {
        username: newUser.username,
        email: newUser.email,
        isAdmin: newUser.isAdmin,
      },
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Đăng nhập
const loginUser = async (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;

    // Tìm user theo username hoặc email
    const user = await User.findOne({
      $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
    });

    if (!user) return res.status(400).json({ code: "auth.invalidCredentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ code: "auth.invalidCredentials" });

    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({
      message: "Login success",
      token,
      user: {
        username: user.username,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Đăng nhập bằng Google (sau khi callback)
const googleLogin = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ code: "auth.googleAuthFailed" });
    }

    const token = jwt.sign(
      { id: req.user._id, username: req.user.username, email: req.user.email }, // thêm email vào token
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.redirect(`http://localhost:5001/auth/success?token=${token}`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Endpoint test sau khi Google login redirect
const googleSuccess = (req, res) => {
  res.send(`Google login success! Token: ${req.query.token}`);
};
// Đổi mật khẩu
const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const userId = req.user.id; // lấy từ JWT sau khi verify

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Nếu là user Google thì không cho đổi password
    if (!user.password) {
      return res.status(400).json({ message: "Google login users cannot change password" });
    }

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Old password is incorrect" });

    // Hash mật khẩu mới
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Chỉ admin toàn quyền mới tạo được admin phụ
const createAdmin = async (req, res) => {
  try {
    // kiểm tra token đã decode
    if (req.user.username !== "admin") {
      return res.status(403).json({ message: "Only super admin can create new admins" });
    }

    const { username, password } = req.body;

    const existUser = await User.findOne({ username });
    if (existUser) return res.status(400).json({ message: "Username already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = new User({
      username,
      password: hashedPassword,
      isAdmin: true // luôn là admin
    });

    await newAdmin.save();

    res.status(201).json({ message: "Admin created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



module.exports = {
  registerUser,
  loginUser,
  createAdmin,
  googleLogin,
  googleSuccess,
  changePassword
};
