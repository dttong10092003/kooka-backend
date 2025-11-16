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
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
