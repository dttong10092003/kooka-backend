const User = require("../models/user");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
async function createUser({ firstName, lastName, email, password }) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const username = await generateUniqueUsername(email);

  const newUser = new User({
    username,
    firstName,
    lastName,
    email,
    password: hashedPassword,
  });

  return await newUser.save();
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
    { expiresIn: "1h" }
  );
}

// Đổi mật khẩu
async function updatePassword(userId, newPassword) {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  return await User.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
}

// Tạo admin
async function createAdminUser(username, password) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const newAdmin = new User({
    username,
    password: hashedPassword,
    isAdmin: true,
  });
  return await newAdmin.save();
}

module.exports = {
  createUser,
  findUserByUsernameOrEmail,
  comparePassword,
  generateToken,
  updatePassword,
  createAdminUser,
};
