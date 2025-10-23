const mongoose = require("mongoose");
const { Schema } = mongoose;

// === Sub-schema cho từng buổi ăn (sáng / trưa / chiều) ===
const MealSchema = new Schema(
  {
    recipeId: { type: String, required: false }, // ID từ recipe-service
    recipeName: { type: String, required: false },
    recipeImage: { type: String, required: false },
  },
  { _id: false }
);

// === Sub-schema cho từng ngày ===
const DayPlanSchema = new Schema(
  {
    date: { type: Date, required: true },
    morning: { type: MealSchema, default: {} },
    noon: { type: MealSchema, default: {} },
    evening: { type: MealSchema, default: {} },
  },
  { _id: false }
);

// === Schema chính cho MealPlan ===
const MealPlanSchema = new Schema(
  {
    userId: { type: String, required: true }, // hoặc ObjectId nếu cùng DB
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },
    plans: { type: [DayPlanSchema], default: [] }, // tối đa 7 ngày
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("MealPlan", MealPlanSchema);
