const mongoose = require("mongoose");

const InstructionSchema = new mongoose.Schema({
  title: String,
  images: {
    type: [String],
    validate: {
      validator: function (arr) {
        return !arr || arr.length <= 4;
      },
      message: "Mỗi bước hướng dẫn chỉ được chứa tối đa 4 ảnh.",
    },
    default: [],
  },
  subTitle: [String],
});

const RecipeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ingredients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Ingredient",
        required: true,
      },
    ],
    tags: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tag",
      },
    ],
    short: String,
    instructions: [InstructionSchema],
    image: String,
    video: String,
    calories: Number,
    time: Number,
    size: Number,
    difficulty: String,
    cuisine: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cuisine",
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    rate: { type: Number, default: 0 },
    numberOfRate: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", RecipeSchema);
