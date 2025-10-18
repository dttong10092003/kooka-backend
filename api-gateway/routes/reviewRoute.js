const express = require('express');
const router = express.Router();
const proxyFactory = require('../utils/proxyFactory');
const verifyToken = require('../middlewares/verifyToken');

const reviewProxy = proxyFactory('http://review-service:5007');

// Public routes (no authentication required)
router.get('/comment/:commentId', reviewProxy);
router.get('/recipe/:recipeId', reviewProxy);
router.get('/recipe/:recipeId/stats', reviewProxy);

// Protected routes (authentication required)
router.post('/', verifyToken, reviewProxy);
router.put('/comment/:commentId', verifyToken, reviewProxy);
router.delete('/comment/:commentId', verifyToken, reviewProxy);
router.get('/recipe/:recipeId/user', verifyToken, reviewProxy);

module.exports = router;
