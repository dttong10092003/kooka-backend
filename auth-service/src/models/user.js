const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    password: { type: String }, // bỏ required vì user Google có thể không có password
    googleId: { type: String, unique: true, sparse: true },
    email: { type: String, unique: true, sparse: true }, // thêm email
    isAdmin: { type: Boolean, default: false }, // true = admin, false = user thường
    resetPasswordToken: { type: String }, // token để reset password
    resetPasswordExpires: { type: Date }, // thời gian hết hạn của token
    isVerified: { type: Boolean, default: false }, // xác thực email
    verificationToken: { type: String }, // token để verify email
    verificationTokenExpires: { type: Date }, // thời gian hết hạn của verification token
    tempFirstName: { type: String }, // Lưu tạm firstName từ form đăng ký
    tempLastName: { type: String }, // Lưu tạm lastName từ form đăng ký
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
