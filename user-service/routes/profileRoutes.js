const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

// CRUD routes cho profile
router.post("/", profileController.createProfile); // Tạo profile
router.get("/:userId", profileController.getProfileByUserId); // Lấy profile theo userId
router.put("/:userId", profileController.updateProfile); // Cập nhật profile

module.exports = router;
