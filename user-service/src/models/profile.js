const mongoose = require("mongoose");

const profileSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true }, // liên kết với auth-service user._id
    firstName: { type: String, required: true },  // bắt buộc
    lastName: { type: String, required: true }, // bắt buộc
    phone: String,
    location: String,
    bio: String,
    birthDate: Date,
    avatar: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Profile", profileSchema);
