const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyAuthService = buildProxy(process.env.AUTH_SERVICE_URL);

// Auth routes - proxy to auth-service
router.post("/register", proxyAuthService);
router.post("/login", proxyAuthService);
router.post("/change-password", proxyAuthService);
router.post("/create-admin", proxyAuthService);

// Google OAuth routes
router.get("/google", proxyAuthService);
router.get("/google/callback", proxyAuthService);
router.get("/success", proxyAuthService);
router.get("/failure", proxyAuthService);

module.exports = router;