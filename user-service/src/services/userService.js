const Profile = require("../models/profile");
const { uploadToCloudinary } = require("../utils/cloudinary");
const { parseBase64 } = require("../utils/parseBase64");

// Helper function để upload ảnh nếu là base64
async function uploadIfBase64(file, folder = "users/avatars") {
  if (!file) return null;
  if (typeof file !== "string") return file;

  // Nếu là base64 thì upload lên Cloudinary
  if (file.startsWith("data:")) {
    const { buffer, fakeFileName } = parseBase64(file);
    return await uploadToCloudinary(buffer, fakeFileName, folder);
  }

  // Nếu là link thì giữ nguyên
  return file;
}

// Tạo profile mới
async function createProfile(data) {
  // Upload avatar nếu là base64
  if (data.avatar) {
    data.avatar = await uploadIfBase64(data.avatar);
  }

  const profile = new Profile(data);
  return await profile.save();
}

// Lấy profile theo userId
async function getProfileByUserId(userId) {
  return await Profile.findOne({ userId });
}

// Cập nhật profile
async function updateProfile(userId, data) {
  // Upload avatar nếu là base64
  if (data.avatar) {
    data.avatar = await uploadIfBase64(data.avatar);
  }

  return await Profile.findOneAndUpdate({ userId }, data, { new: true });
}

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
}
