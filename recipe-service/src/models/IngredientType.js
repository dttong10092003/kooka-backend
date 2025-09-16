const mongoose = require("mongoose");

const ingredientTypeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("IngredientType", ingredientTypeSchema);
