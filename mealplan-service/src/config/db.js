const mongoose = require("mongoose");

async function connectDB(uri) {
  if (!uri) throw new Error("MONGODB_URI is required");
  mongoose.set("strictQuery", false);
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}

module.exports = connectDB;
