const mongoose = require("mongoose");
const unitDBConnection = require("../config/unitDB");

// Schema để lưu số lượng và đơn vị của nguyên liệu trong recipe
const RecipeIngredientUnitSchema = new mongoose.Schema({
  recipeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0.01
  },
  unit: {
    type: String,
    required: true,
    enum: [
      // Đơn vị cân nặng
      'gram', 'kg',
      // Đơn vị thể tích
      'ml', 'lít',
      // Đơn vị đếm
      'con', 'quả', 'củ', 'cái', 'trái', 'tép', 'miếng',
      // Đơn vị rau lá
      'bó', 'nắm', 'nhánh', 'lá', 'cây',
      // Đơn vị đo lường nhà bếp
      'muỗng canh', 'muỗng cà phê', 'chén', 'cốc',
      // Đơn vị đóng gói
      'gói', 'hộp', 'ổ', 'thanh'
    ]
  }
}, { 
  timestamps: true 
});

// Index để query nhanh
RecipeIngredientUnitSchema.index({ recipeId: 1, ingredientId: 1 }, { unique: true });

// Sử dụng connection riêng cho database KookaUnit
module.exports = unitDBConnection.model("RecipeIngredientUnit", RecipeIngredientUnitSchema);
