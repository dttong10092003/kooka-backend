const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');

// Public routes (no authentication required)
// Get top comments (by likes and replies)
router.get('/top', commentController.getTopComments);

// Get newest comments
router.get('/newest', commentController.getNewestComments);

// Get comments by recipe ID with pagination
router.get('/recipe/:recipeId', commentController.getCommentsByRecipe);

// Get replies for a comment
router.get('/:commentId/replies', commentController.getReplies);

// Get comment count for a recipe
router.get('/recipe/:recipeId/count', commentController.getCommentCount);

// Protected routes (authentication handled by API Gateway)
// Create a new comment
router.post('/', commentController.createComment);

// Update a comment
router.put('/:commentId', commentController.updateComment);

// Delete a comment
router.delete('/:commentId', commentController.deleteComment);

// Update like count (called by like-service)
router.patch('/:commentId/likes', commentController.updateLikeCount);

module.exports = router;
