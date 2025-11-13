const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favoriteController');

// Public routes (no authentication required)
// Get most favorited recipes
router.get('/most-favorited', favoriteController.getMostFavoritedRecipes);

// Get favorite count for a recipe
router.get('/recipe/:recipeId/count', favoriteController.getFavoriteCount);

// Check if user favorited a recipe
router.get('/recipe/:recipeId/user/:userId', favoriteController.checkUserFavorited);

// Get all favorites by a user
router.get('/user/:userId', favoriteController.getUserFavorites);

// Get all users who favorited a recipe
router.get('/recipe/:recipeId', favoriteController.getRecipeFavorites);

// 🔔 Internal API - Get userIds who favorited a recipe (for notification-service)
router.get('/recipe/:recipeId/users', favoriteController.getUserIdsByRecipe);

// Protected routes (authentication handled by API Gateway)
// Toggle favorite (add/remove)
router.post('/toggle', favoriteController.toggleFavorite);

// Check multiple recipes at once
router.post('/check-multiple', favoriteController.checkMultipleRecipes);

module.exports = router;
