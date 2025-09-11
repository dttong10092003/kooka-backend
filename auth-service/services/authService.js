const {
  registerUser,
  loginUser,
  createAdmin,
  googleLogin,
  googleSuccess,
  changePassword,
} = require("../controllers/authController");

// Services chỉ export lại controller -> để các route/module khác gọi
module.exports = {
  registerUser,
  loginUser,
  createAdmin,
  googleLogin,
  googleSuccess,
  changePassword,
};
