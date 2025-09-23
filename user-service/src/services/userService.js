const Profile = require("../models/profile")

// Tạo profile mới
async function createProfile(data) {
  const profile = new Profile(data)
  return await profile.save()
}

// Lấy profile theo userId
async function getProfileByUserId(userId) {
  return await Profile.findOne({ userId })
}

// Cập nhật profile
async function updateProfile(userId, data) {
  return await Profile.findOneAndUpdate({ userId }, data, { new: true })
}

module.exports = {
  createProfile,
  getProfileByUserId,
  updateProfile,
}
