const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyRecipeService = buildProxy(process.env.RECIPE_SERVICE_URL);

// Routes cho user - Tạo đề xuất và xem đề xuất của mình
router.post("/", verifyToken, proxyRecipeService); // User tạo đề xuất
router.get("/my-submissions", verifyToken, proxyRecipeService); // User xem đề xuất của mình

// Routes cho admin - Xem tất cả và quản lý đề xuất
router.get("/", verifyToken, isAdmin, proxyRecipeService); // Admin xem tất cả đề xuất
router.get("/pending-count", verifyToken, isAdmin, proxyRecipeService); // Đếm số đề xuất pending

// Routes chung - Xem chi tiết và xóa
router.get("/:id", verifyToken, proxyRecipeService); // Xem chi tiết đề xuất
router.delete("/:id", verifyToken, proxyRecipeService); // Xóa đề xuất

// Routes cho admin - Duyệt/từ chối đề xuất
router.patch("/:id/approve", verifyToken, isAdmin, proxyRecipeService); // Duyệt đề xuất
router.patch("/:id/reject", verifyToken, isAdmin, proxyRecipeService); // Từ chối đề xuất

module.exports = router;
