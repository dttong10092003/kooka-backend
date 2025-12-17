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

const RecipeSubmissionSchema = new mongoose.Schema(
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
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'rejected'], 
      default: 'pending'
    },
    submittedBy: {
      type: String, // User ID từ auth service
      required: true
    },
    submittedByName: {
      type: String, // Tên người đề xuất
      required: false
    },
    rejectionReason: {
      type: String,
      required: false
    },
    approvedBy: {
      type: String, // Admin ID
      required: false
    },
    approvedAt: {
      type: Date,
      required: false
    },
    recipeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recipe",
      required: false // Sẽ được set sau khi approved
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("RecipeSubmission", RecipeSubmissionSchema);
