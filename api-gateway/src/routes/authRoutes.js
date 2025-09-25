const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

// Proxy tới auth-service
// const proxyAuthService = buildProxy(process.env.AUTH_SERVICE_URL);
const proxyAuthService = buildProxy(
  process.env.AUTH_SERVICE_URL,
  { "^/api/auth": "/auth" }  // rewrite prefix
);
// Các route auth
router.post("/register", proxyAuthService);
router.post("/login", proxyAuthService);
router.post("/change-password", proxyAuthService);
router.post("/create-admin", proxyAuthService);

// Google login
router.get("/google", proxyAuthService);
router.get("/google/callback", proxyAuthService);
router.get("/success", proxyAuthService);
router.get("/failure", proxyAuthService);

module.exports = router;
