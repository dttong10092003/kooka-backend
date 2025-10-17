const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyTagService = buildProxy(process.env.RECIPE_SERVICE_URL);

router.get("/", proxyTagService);
router.get("/:id", proxyTagService);
router.post("/", verifyToken, isAdmin, proxyTagService);
router.put("/:id", verifyToken, isAdmin, proxyTagService);
router.delete("/:id", verifyToken, isAdmin, proxyTagService);

module.exports = router;
