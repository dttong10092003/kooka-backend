const mongoose = require("mongoose");

const ingredientTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameLowercase: { type: String, unique: true },
  },
  { timestamps: true }
);

// Middleware để tự động tạo nameLowercase trước khi save
ingredientTypeSchema.pre('save', function(next) {
  if (this.name) {
    this.nameLowercase = this.name.toLowerCase().trim();
  }
  next();
});

// Middleware để tự động cập nhật nameLowercase trước khi update
ingredientTypeSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.name || (update.$set && update.$set.name)) {
    const name = update.name || update.$set.name;
    if (!update.$set) update.$set = {};
    update.$set.nameLowercase = name.toLowerCase().trim();
  }
  next();
});

module.exports = mongoose.model("IngredientType", ingredientTypeSchema);
