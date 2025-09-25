const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

// Proxy tới user-service
const proxyUserService = buildProxy(process.env.USER_SERVICE_URL);

// CRUD profile
router.post("/profiles", proxyUserService);
router.get("/profiles/:userId", proxyUserService);
router.put("/profiles/:userId", proxyUserService);

module.exports = router;
