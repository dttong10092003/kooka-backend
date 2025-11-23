const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const passport = require("passport");
const jwt = require("jsonwebtoken");

// Middleware check JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/change-password", authenticateJWT, authController.changePassword);
router.post("/create-admin", authenticateJWT, authController.createAdmin);

// Get user by ID (for other services)
router.get("/user/:userId", authController.getUserById);

// Forgot Password & Reset Password routes
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/reset-password/:token", authController.resetPassword);

// Google Login for Web (OAuth flow)
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get("/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/failure" }),
  authController.googleLogin
);
router.get("/success", authController.googleSuccess);
router.get("/failure", (req, res) => res.send("Google login failed"));

// Google Login for Mobile (React Native)
router.post("/google/mobile", authController.googleLoginMobile);

// Email Verification routes
router.get("/verify-email", authController.verifyEmail);
router.get("/verify-email/:token", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationEmail);


// Only super admin create new admin
// router.post("/create-admin", authenticateJWT, authController.createAdmin);

module.exports = router;
