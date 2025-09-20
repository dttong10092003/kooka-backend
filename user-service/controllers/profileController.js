const Profile = require("../models/profile");

// Tạo profile mới
exports.createProfile = async (req, res) => {
  try {
    const { userId, firstName, lastName, phone, location, bio, birthDate, avatar } = req.body;

    // Check nếu profile đã tồn tại
    const existing = await Profile.findOne({ userId });
    if (existing) {
      return res.status(400).json({ message: "Profile already exists" });
    }

    const profile = await Profile.create({
      userId,
      firstName,
      lastName,
      phone,
      location,
      bio,
      birthDate,
      avatar,
    });

    res.status(201).json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy profile theo userId
exports.getProfileByUserId = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.params.userId });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { userId: req.params.userId },
      req.body,
      { new: true }
    );
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
