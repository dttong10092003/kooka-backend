const mongoose = require("mongoose");

const MonthlyViewSchema = new mongoose.Schema(
  {
    recipeId: {
      type: String,
      required: true,
      index: true,
    },
    year: {
      type: Number,
      required: true,
      index: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Tạo compound index để đảm bảo mỗi recipe chỉ có 1 document cho mỗi tháng
MonthlyViewSchema.index({ recipeId: 1, year: 1, month: 1 }, { unique: true });

// Index cho query theo tháng
MonthlyViewSchema.index({ year: 1, month: 1 });

module.exports = mongoose.model("MonthlyView", MonthlyViewSchema);
