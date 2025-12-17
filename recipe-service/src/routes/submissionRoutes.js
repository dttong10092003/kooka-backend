const express = require("express");
const router = express.Router();
const submissionController = require("../controllers/submissionController");

// Routes cho user
router.post("/", submissionController.createSubmission); // User tạo đề xuất
router.get("/my-submissions", submissionController.getMySubmissions); // User xem đề xuất của mình

// Routes cho admin
router.get("/", submissionController.getAllSubmissions); // Admin xem tất cả đề xuất
router.get("/pending-count", submissionController.getPendingCount); // Đếm số đề xuất pending

// Routes chung
router.get("/:id", submissionController.getSubmission); // Xem chi tiết đề xuất
router.delete("/:id", submissionController.deleteSubmission); // Xóa đề xuất

// Routes cho admin approve/reject
router.patch("/:id/approve", submissionController.approveSubmission); // Duyệt đề xuất
router.patch("/:id/reject", submissionController.rejectSubmission); // Từ chối đề xuất

module.exports = router;
