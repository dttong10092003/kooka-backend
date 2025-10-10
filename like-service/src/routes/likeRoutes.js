const express = require('express');
const router = express.Router();
const likeController = require('../controllers/likeController');

// Public routes (no authentication required)
// Get like count for a comment
router.get('/comment/:commentId/count', likeController.getLikeCount);

// Check if user liked a comment
router.get('/comment/:commentId/user/:userId', likeController.checkUserLiked);

// Get all likes by a user
router.get('/user/:userId', likeController.getUserLikes);

// Get all users who liked a comment
router.get('/comment/:commentId', likeController.getCommentLikes);

// Protected routes (authentication handled by API Gateway)
// Toggle like (like/unlike)
router.post('/toggle', likeController.toggleLike);

module.exports = router;
