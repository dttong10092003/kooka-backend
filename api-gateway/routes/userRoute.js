const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyUserService = buildProxy(process.env.USER_SERVICE_URL);

// Profile routes - proxy to user-service
router.post("/profile", proxyUserService);
router.get("/profile/:userId", proxyUserService);
router.put("/profile/:userId", proxyUserService);

module.exports = router;