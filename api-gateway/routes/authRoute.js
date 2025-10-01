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

// Google OAuth routes
router.get("/google", proxyAuthService);
router.get("/google/callback", proxyAuthService);
router.get("/success", proxyAuthService);
router.get("/failure", proxyAuthService);

module.exports = router;