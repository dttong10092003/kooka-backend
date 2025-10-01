const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyUserService = buildProxy(process.env.USER_SERVICE_URL);

// Profile routes - proxy to user-service (all protected routes)
router.post("/profile", verifyToken, proxyUserService);
router.get("/profile/:userId", verifyToken, proxyUserService);
router.put("/profile/:userId", verifyToken, proxyUserService);

module.exports = router;