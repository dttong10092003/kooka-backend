const express = require("express");
const router = express.Router();
const passport = require("passport");
const jwt = require("jsonwebtoken");
const authController = require("../controllers/authController"); // ✅ dùng controller thay vì service

const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = user;
    next();
  });
};

// Signup & Login
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);

// Google login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/failure" }),
  authController.googleLogin
);
router.get("/success", authController.googleSuccess);
router.get("/failure", (req, res) => res.send("Google login failed"));

// Change password
router.post("/change-password", authenticateJWT, authController.changePassword);

// Only super admin create new admin
router.post("/create-admin", authenticateJWT, authController.createAdmin);

module.exports = router;
