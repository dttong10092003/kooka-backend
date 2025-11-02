const mongoose = require("mongoose");

const ViewSchema = new mongoose.Schema(
  {
    recipeId: {
      type: String,
      required: true,
      index: true,
    },
    views: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Tạo unique index cho recipeId để đảm bảo mỗi recipe chỉ có 1 document
ViewSchema.index({ recipeId: 1 }, { unique: true });

module.exports = mongoose.model("View", ViewSchema);
