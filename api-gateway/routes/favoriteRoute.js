const express = require('express');
const router = express.Router();
const proxyFactory = require('../utils/proxyFactory');
const verifyToken = require('../middlewares/verifyToken');

const favoriteProxy = proxyFactory('http://favorite-service:5006');

// Public routes (no authentication required)
router.get('/most-favorited', favoriteProxy);
router.get('/recipe/:recipeId/count', favoriteProxy);
router.get('/recipe/:recipeId/user/:userId', favoriteProxy);
router.get('/user/:userId', favoriteProxy);
router.get('/recipe/:recipeId', favoriteProxy);

// Protected routes (authentication required)
router.post('/toggle', verifyToken, favoriteProxy);
router.post('/check-multiple', verifyToken, favoriteProxy);

module.exports = router;
