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

// Xóa meal plan
router.delete("/:id", verifyToken, proxyMealPlanService);

// 🤖 Admin: Trigger auto-update status manually (không cần verifyToken vì chỉ để test)
router.post("/admin/auto-update-status", proxyMealPlanService);

module.exports = router;
