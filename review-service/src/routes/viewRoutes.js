const express = require("express");
const router = express.Router();
const viewController = require("../controllers/viewController");

// ===== IMPORTANT: Thứ tự routes rất quan trọng! =====
// Các route CỤ THỂ phải đặt TRƯỚC các route có PARAMS
// Nếu không Express sẽ hiểu nhầm "monthly" là recipeId

// ===== MONTHLY VIEWS ROUTES (đặt trước) =====

// GET /api/views/monthly/total?year=2025&month=11 - Tổng views tất cả recipes trong tháng
router.get("/monthly/total", viewController.getTotalMonthlyViews);

// GET /api/views/monthly/top?limit=10&year=2025&month=11 - Top recipes trong tháng
router.get("/monthly/top", viewController.getTopMonthlyRecipes);

// GET /api/views/monthly/stats?months=12 - Thống kê views theo nhiều tháng
router.get("/monthly/stats", viewController.getMonthlyStats);

// ===== GENERAL ROUTES =====

// POST /api/views/batch - Lấy view count cho nhiều recipes
router.post("/batch", viewController.getViewCountForRecipes);

// GET /api/views/top - Lấy top recipes có nhiều view nhất (tất cả thời gian)
router.get("/top", viewController.getTopViewedRecipes);

// ===== RECIPE-SPECIFIC ROUTES (có :recipeId param, đặt cuối) =====

// POST /api/views/:recipeId/increment - Tăng view count khi user xem recipe
router.post("/:recipeId/increment", viewController.incrementView);

// GET /api/views/:recipeId/count - Lấy số lượt view của 1 recipe
router.get("/:recipeId/count", viewController.getViewCount);

// GET /api/views/:recipeId/monthly?year=2025&month=11 - Views của 1 recipe trong tháng
router.get("/:recipeId/monthly", viewController.getMonthlyViewCount);

// GET /api/views/:recipeId/history?months=12 - Lịch sử views của recipe theo tháng
router.get("/:recipeId/history", viewController.getRecipeViewHistory);

module.exports = router;
