const View = require("../models/View");
const MonthlyView = require("../models/MonthlyView");

// Cache để track views trong session (tránh duplicate trong vài giây)
const viewCache = new Map();
const CACHE_DURATION = 5000; // 5 giây

// Increment view count cho recipe
async function incrementView(recipeId, sessionId = null) {
  try {
    // Tạo cache key từ recipeId và sessionId (nếu có)
    const cacheKey = sessionId ? `${recipeId}-${sessionId}` : recipeId;
    
    // Kiểm tra xem view này đã được count trong vài giây gần đây chưa
    const lastViewTime = viewCache.get(cacheKey);
    const now = Date.now();
    
    if (lastViewTime && (now - lastViewTime) < CACHE_DURATION) {
      // Nếu vừa count trong vòng 5 giây, không count nữa
      // Vẫn trả về view hiện tại
      const view = await View.findOne({ recipeId });
      return view || { recipeId, views: 0 };
    }
    
    // Cập nhật cache
    viewCache.set(cacheKey, now);
    
    // Clear cache sau một thời gian để không tốn memory
    setTimeout(() => {
      viewCache.delete(cacheKey);
    }, CACHE_DURATION);
    
    // Tăng view count (tổng)
    const view = await View.findOneAndUpdate(
      { recipeId },
      { $inc: { views: 1 } },
      { 
        new: true, 
        upsert: true, // Tạo mới nếu chưa tồn tại
        setDefaultsOnInsert: true 
      }
    );
    
    // Tăng view count cho tháng hiện tại
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() trả về 0-11
    
    await MonthlyView.findOneAndUpdate(
      { 
        recipeId, 
        year: currentYear, 
        month: currentMonth 
      },
      { $inc: { views: 1 } },
      { 
        upsert: true, 
        setDefaultsOnInsert: true 
      }
    );
    
    return view;
  } catch (error) {
    throw error;
  }
}

// Lấy số lượt view của recipe
async function getViewCount(recipeId) {
  try {
    const view = await View.findOne({ recipeId });
    return view ? view.views : 0;
  } catch (error) {
    throw error;
  }
}

// Lấy view count cho nhiều recipes
async function getViewCountForRecipes(recipeIds) {
  try {
    const views = await View.find({ recipeId: { $in: recipeIds } });
    
    // Convert to map để dễ tra cứu
    const viewMap = {};
    views.forEach(view => {
      viewMap[view.recipeId] = view.views;
    });
    
    return viewMap;
  } catch (error) {
    throw error;
  }
}

// Lấy top recipes có nhiều view nhất
async function getTopViewedRecipes(limit = 10) {
  try {
    const topViews = await View.find()
      .sort({ views: -1 })
      .limit(limit)
      .select('recipeId views');
    
    return topViews;
  } catch (error) {
    throw error;
  }
}

// Lấy tổng views của recipe trong tháng hiện tại
async function getMonthlyViewCount(recipeId, year = null, month = null) {
  try {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || (currentDate.getMonth() + 1);
    
    const monthlyView = await MonthlyView.findOne({ 
      recipeId, 
      year: targetYear, 
      month: targetMonth 
    });
    
    return monthlyView ? monthlyView.views : 0;
  } catch (error) {
    throw error;
  }
}

// Lấy tổng views của tất cả recipes trong tháng hiện tại
async function getTotalMonthlyViews(year = null, month = null) {
  try {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || (currentDate.getMonth() + 1);
    
    const result = await MonthlyView.aggregate([
      {
        $match: {
          year: targetYear,
          month: targetMonth
        }
      },
      {
        $group: {
          _id: null,
          totalViews: { $sum: "$views" }
        }
      }
    ]);
    
    return result.length > 0 ? result[0].totalViews : 0;
  } catch (error) {
    throw error;
  }
}

// Lấy top recipes có nhiều view nhất trong tháng
async function getTopMonthlyRecipes(limit = 10, year = null, month = null) {
  try {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    const targetMonth = month || (currentDate.getMonth() + 1);
    
    const topMonthlyViews = await MonthlyView.find({
      year: targetYear,
      month: targetMonth
    })
      .sort({ views: -1 })
      .limit(limit)
      .select('recipeId views year month');
    
    return topMonthlyViews;
  } catch (error) {
    throw error;
  }
}

// Lấy lịch sử views của recipe theo từng tháng
async function getRecipeViewHistory(recipeId, numberOfMonths = 12) {
  try {
    const currentDate = new Date();
    const history = [];
    
    for (let i = 0; i < numberOfMonths; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const monthlyView = await MonthlyView.findOne({ 
        recipeId, 
        year, 
        month 
      });
      
      history.push({
        year,
        month,
        views: monthlyView ? monthlyView.views : 0,
        monthLabel: `${year}-${String(month).padStart(2, '0')}`
      });
    }
    
    return history.reverse(); // Trả về từ cũ nhất đến mới nhất
  } catch (error) {
    throw error;
  }
}

// Lấy thống kê views theo nhiều tháng
async function getMonthlyStats(numberOfMonths = 12) {
  try {
    const currentDate = new Date();
    const stats = [];
    
    for (let i = 0; i < numberOfMonths; i++) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      
      const totalViews = await getTotalMonthlyViews(year, month);
      
      // Đếm số recipes có views trong tháng
      const uniqueRecipes = await MonthlyView.countDocuments({ 
        year, 
        month 
      });
      
      stats.push({
        year,
        month,
        monthLabel: `${year}-${String(month).padStart(2, '0')}`,
        totalViews,
        uniqueRecipes
      });
    }
    
    return stats.reverse(); // Trả về từ cũ nhất đến mới nhất
  } catch (error) {
    throw error;
  }
}

module.exports = {
  incrementView,
  getViewCount,
  getViewCountForRecipes,
  getTopViewedRecipes,
  getMonthlyViewCount,
  getTotalMonthlyViews,
  getTopMonthlyRecipes,
  getRecipeViewHistory,
  getMonthlyStats,
};
