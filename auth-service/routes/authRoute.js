const express = require("express");
const router = express.Router();
const passport = require("passport");
const authService = require("../services/authService");
const jwt = require("jsonwebtoken");

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
router.post("/register", authService.registerUser);
router.post("/login", authService.loginUser);

// Google login
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/auth/failure" }),
  authService.googleLogin
);
router.get("/success", authService.googleSuccess);
router.get("/failure", (req, res) => res.send("Google login failed"));

// Change password
router.post("/change-password", authenticateJWT, authService.changePassword);

// Only super admin create new admin
router.post("/create-admin", authenticateJWT, authService.createAdmin);

module.exports = router;
