const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

// CRUD routes cho profile
router.post("/", profileController.createProfile);
router.get("/count", profileController.getUserCount);
router.get("/recent", profileController.getRecentUsers);
router.get("/stats/weekly", profileController.getUsersByWeek);
router.get("/:userId", profileController.getProfileByUserId);
router.put("/:userId", profileController.updateProfile);

module.exports = router;
