const viewService = require("../services/viewService");

// Increment view khi người dùng xem recipe
exports.incrementView = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { sessionId } = req.body; // Optional: sessionId từ frontend để track better
    
    if (!recipeId) {
      return res.status(400).json({ error: "Recipe ID is required" });
    }

    const view = await viewService.incrementView(recipeId, sessionId);
    
    res.json({
      message: "View incremented successfully",
      recipeId: view.recipeId,
      views: view.views,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy số lượt view của 1 recipe
exports.getViewCount = async (req, res) => {
  try {
    const { recipeId } = req.params;
    
    if (!recipeId) {
      return res.status(400).json({ error: "Recipe ID is required" });
    }

    const count = await viewService.getViewCount(recipeId);
    
    res.json({
      recipeId,
      views: count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy view count cho nhiều recipes (batch)
exports.getViewCountForRecipes = async (req, res) => {
  try {
    const { recipeIds } = req.body;
    
    if (!recipeIds || !Array.isArray(recipeIds)) {
      return res.status(400).json({ 
        error: "recipeIds array is required in request body" 
      });
    }

    const viewMap = await viewService.getViewCountForRecipes(recipeIds);
    
    res.json(viewMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy top recipes có nhiều view nhất
exports.getTopViewedRecipes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const topViews = await viewService.getTopViewedRecipes(limit);
    
    res.json(topViews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ===== MONTHLY VIEWS ENDPOINTS =====

// Lấy tổng views của 1 recipe trong tháng
exports.getMonthlyViewCount = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const month = req.query.month ? parseInt(req.query.month) : null;
    
    if (!recipeId) {
      return res.status(400).json({ error: "Recipe ID is required" });
    }

    const count = await viewService.getMonthlyViewCount(recipeId, year, month);
    
    res.json({
      recipeId,
      year: year || new Date().getFullYear(),
      month: month || (new Date().getMonth() + 1),
      views: count,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy tổng views của tất cả recipes trong tháng
exports.getTotalMonthlyViews = async (req, res) => {
  try {
    const year = req.query.year ? parseInt(req.query.year) : null;
    const month = req.query.month ? parseInt(req.query.month) : null;
    
    const totalViews = await viewService.getTotalMonthlyViews(year, month);
    
    res.json({
      year: year || new Date().getFullYear(),
      month: month || (new Date().getMonth() + 1),
      totalViews,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy top recipes trong tháng
exports.getTopMonthlyRecipes = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const year = req.query.year ? parseInt(req.query.year) : null;
    const month = req.query.month ? parseInt(req.query.month) : null;
    
    const topRecipes = await viewService.getTopMonthlyRecipes(limit, year, month);
    
    res.json({
      year: year || new Date().getFullYear(),
      month: month || (new Date().getMonth() + 1),
      recipes: topRecipes,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy lịch sử views của recipe theo tháng
exports.getRecipeViewHistory = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const numberOfMonths = parseInt(req.query.months) || 12;
    
    if (!recipeId) {
      return res.status(400).json({ error: "Recipe ID is required" });
    }

    const history = await viewService.getRecipeViewHistory(recipeId, numberOfMonths);
    
    res.json({
      recipeId,
      numberOfMonths,
      history,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Lấy thống kê views theo nhiều tháng
exports.getMonthlyStats = async (req, res) => {
  try {
    const numberOfMonths = parseInt(req.query.months) || 12;
    
    const stats = await viewService.getMonthlyStats(numberOfMonths);
    
    res.json({
      numberOfMonths,
      stats,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
