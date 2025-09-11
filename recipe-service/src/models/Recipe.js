const mongoose = require("mongoose");

const InstructionSchema = new mongoose.Schema({
  title: String,
  image: String,
  subTitle: [String],
});

const RecipeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ingredients: [String],
    tags: [String],
    short: String,
    instructions: [InstructionSchema],
    image: String,
    video: String,
    calories: Number,
    time: Number,
    size: Number,
    difficulty: String,
    cuisine: String,
    category: String,
    rate: Number,
    numberOfRate: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Recipe", RecipeSchema);
