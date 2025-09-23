const userService = require("../services/userService")

// Tạo profile mới
exports.createProfile = async (req, res) => {
  try {
    const { userId, firstName, lastName } = req.body

    // Check nếu profile đã tồn tại
    const existing = await userService.getProfileByUserId(userId)
    if (existing) {
      return res.status(400).json({ message: "Profile already exists" })
    }

    const profile = await userService.createProfile(req.body)
    res.status(201).json(profile)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Lấy profile theo userId
exports.getProfileByUserId = async (req, res) => {
  try {
    const profile = await userService.getProfileByUserId(req.params.userId)
    if (!profile) return res.status(404).json({ message: "Profile not found" })
    res.json(profile)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const profile = await userService.updateProfile(req.params.userId, req.body)
    if (!profile) return res.status(404).json({ message: "Profile not found" })
    res.json(profile)
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}
