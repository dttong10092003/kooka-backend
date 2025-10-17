const mongoose = require("mongoose");

const CuisineSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cuisine", CuisineSchema);
