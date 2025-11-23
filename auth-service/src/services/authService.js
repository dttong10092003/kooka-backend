const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("./emailService");

// Tạo username unique từ email
async function generateUniqueUsername(email) {
  let baseUsername = email.split("@")[0];
  let username = baseUsername;
  let counter = 1;

  while (await User.findOne({ username })) {
    username = `${baseUsername}${counter}`;
    counter++;
  }

  return username;
}

// Đăng ký
async function createUser({ email, password }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const username = await generateUniqueUsername(email);

  // Tạo verification token
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

  const newUser = new User({
    username,
    email,
    password: hashedPassword,
    isVerified: false, // Chưa xác thực
    verificationToken: hashedToken,
    verificationTokenExpires: Date.now() + 24 * 3600000, // 24 giờ
  });

  const savedUser = await newUser.save();

  // Gửi email xác thực
  try {
    await emailService.sendVerificationEmail(email, verificationToken);
  } catch (error) {
    console.error("❌ Lỗi khi gửi email xác thực:", error.message);
    // Không throw error để vẫn cho phép user đăng ký
  }

  return savedUser;
}

// Tìm user theo username hoặc email
async function findUserByUsernameOrEmail(usernameOrEmail) {
  return await User.findOne({
    $or: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });
}

// So sánh password
async function comparePassword(plain, hashed) {
  return await bcrypt.compare(plain, hashed);
}

// Tạo token JWT
function generateToken(user) {
  return jwt.sign(
    { id: user._id, username: user.username, email: user.email, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    { expiresIn: "3h" }
  );
}

// Đổi mật khẩu
async function updatePassword(userId, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return await User.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
}

// Tạo admin
async function createAdminUser({ email, password }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const username = await generateUniqueUsername(email);
  
  const newAdmin = new User({
    username,
    email,
    password: hashedPassword,
    isAdmin: true,
  });
  return await newAdmin.save();
}

// Forgot Password - Tạo token và gửi email
async function forgotPassword(email) {
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error("Email không tồn tại trong hệ thống");
  }

  // Tạo reset token random
  const resetToken = crypto.randomBytes(32).toString("hex");
  
  // Hash token trước khi lưu vào DB (bảo mật)
  const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
  
  // Lưu token và thời gian hết hạn vào DB
  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 giờ
  await user.save();

  // Gửi email với token gốc (chưa hash)
  await emailService.sendResetPasswordEmail(email, resetToken);

  return { message: "Email đặt lại mật khẩu đã được gửi" };
}

// Reset Password - Kiểm tra token và cập nhật mật khẩu mới
async function resetPassword(token, newPassword) {
  // Hash token từ URL để so sánh với token trong DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Tìm user với token hợp lệ và chưa hết hạn
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new Error("Token không hợp lệ hoặc đã hết hạn");
  }

  // Cập nhật mật khẩu mới
  user.password = await bcrypt.hash(newPassword, 10);
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  return { message: "Mật khẩu đã được đặt lại thành công" };
}

// Verify Email - Xác thực email
async function verifyEmail(token, firstName, lastName) {
  const axios = require("axios");
  const USER_SERVICE_URL = process.env.USER_SERVICE_URL || "http://localhost:5002";
  
  // Hash token từ URL để so sánh với token trong DB
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

  // Tìm user với token hợp lệ và chưa hết hạn
  const user = await User.findOne({
    verificationToken: hashedToken,
    verificationTokenExpires: { $gt: Date.now() },
  });

  if (!user) {
    throw new Error("Token không hợp lệ hoặc đã hết hạn");
  }

  // Xác thực email
  user.isVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  // Tạo profile ở user-service sau khi verify thành công
  try {
    await axios.post(`${USER_SERVICE_URL}/api/user/profile`, {
      userId: user._id,
      firstName: firstName || user.username,
      lastName: lastName || "",
    });
    console.log("✅ Profile created successfully after verification");
  } catch (error) {
    console.error("❌ Lỗi khi tạo profile sau verification:", error.message);
    // Không throw error, user đã được verify
  }

  return { message: "Xác thực email thành công" };
}

// Gửi lại email verification
async function resendVerificationEmail(email) {
  const user = await User.findOne({ email });
  
  if (!user) {
    throw new Error("Email không tồn tại trong hệ thống");
  }

  if (user.isVerified) {
    throw new Error("Tài khoản đã được xác thực");
  }

  // Tạo token mới
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");

  user.verificationToken = hashedToken;
  user.verificationTokenExpires = Date.now() + 24 * 3600000; // 24 giờ
  await user.save();

  // Gửi email
  await emailService.sendVerificationEmail(email, verificationToken);

  return { message: "Email xác thực đã được gửi lại" };
}

module.exports = {
  createUser,
  findUserByUsernameOrEmail,
  comparePassword,
  generateToken,
  updatePassword,
  createAdminUser,
  forgotPassword,
  resetPassword,
  generateUniqueUsername,
  verifyEmail,
  resendVerificationEmail,
};
