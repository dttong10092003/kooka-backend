const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

// URL gốc của mealplan-service
const proxyMealPlanService = buildProxy(process.env.MEALPLAN_SERVICE_URL);

// ===== Routes =====

// Lấy tất cả meal plan theo userId
router.get("/:userId", verifyToken, proxyMealPlanService);

// Tạo meal plan mới
router.post("/", verifyToken, proxyMealPlanService);

// Cập nhật meal plan (thay đổi món, ngày, ...)
router.patch("/:id", verifyToken, proxyMealPlanService);

// Cập nhật trạng thái meal plan (pending ↔ completed)
router.patch("/:id/status", verifyToken, proxyMealPlanService);

// Xóa meal plan
router.delete("/:id", verifyToken, proxyMealPlanService);

module.exports = router;
