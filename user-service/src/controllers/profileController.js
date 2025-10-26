const userService = require("../services/userService");

// Tạo profile mới
exports.createProfile = async (req, res) => {
  try {
    const { userId, firstName, lastName } = req.body;

    // Check nếu profile đã tồn tại
    const existing = await userService.getProfileByUserId(userId);
    if (existing) {
      return res.status(400).json({ message: "Profile already exists" });
    }

    const profile = await userService.createProfile(req.body);
    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

// Đếm số user
exports.getUserCount = async (req, res) => {
  try {
    const count = await userService.getUserCount();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Lấy danh sách recent users
exports.getRecentUsers = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const users = await userService.getRecentUsers(limit);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Lấy số users đăng ký theo tuần của mỗi tháng
exports.getUsersByWeek = async (req, res) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    
    const stats = await userService.getUsersByWeek(year, month);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
