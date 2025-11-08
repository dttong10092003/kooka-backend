const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// Get total review count
router.get('/count', reviewController.getReviewCount);

// Get all reviews by current user
router.get('/user', reviewController.getUserReviews);

// Create review (with comment)
router.post('/', reviewController.createReview);

// Update review
router.put('/comment/:commentId', reviewController.updateReview);

// Delete review
router.delete('/comment/:commentId', reviewController.deleteReview);

// Get review by comment ID
router.get('/comment/:commentId', reviewController.getReviewByComment);

// Get all reviews for a recipe
router.get('/recipe/:recipeId', reviewController.getReviewsByRecipe);

// Get user's review for a specific recipe
router.get('/recipe/:recipeId/user', reviewController.getUserReviewForRecipe);

// Get rating statistics for a recipe
router.get('/recipe/:recipeId/stats', reviewController.getRecipeRatingStats);

module.exports = router;
