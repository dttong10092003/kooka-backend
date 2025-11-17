const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyAuthService = buildProxy(process.env.AUTH_SERVICE_URL);

// Auth routes - proxy to auth-service
router.post("/register", proxyAuthService);
router.post("/login", proxyAuthService);
router.post("/change-password", verifyToken, proxyAuthService);
router.post("/create-admin", verifyToken, isAdmin, proxyAuthService);

// Forgot Password & Reset Password routes
router.post("/forgot-password", proxyAuthService);
router.post("/reset-password", proxyAuthService);
router.post("/reset-password/:token", proxyAuthService);

// Google OAuth routes (for Web)
router.get("/google", proxyAuthService);
router.get("/google/callback", proxyAuthService);
router.get("/success", proxyAuthService);
router.get("/failure", proxyAuthService);

// Google Login for Mobile (React Native)
router.post("/google/mobile", proxyAuthService);

module.exports = router;