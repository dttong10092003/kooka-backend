const express = require('express');
const router = express.Router();
const proxyFactory = require('../utils/proxyFactory');
const verifyToken = require('../middlewares/verifyToken');

const commentProxy = proxyFactory('http://comment-service:5004');

// Public routes (no authentication required)
router.get('/recipe/:recipeId', commentProxy);
router.get('/:commentId/replies', commentProxy);
router.get('/recipe/:recipeId/count', commentProxy);

// Protected routes (authentication required)
router.post('/', verifyToken, commentProxy);
router.put('/:commentId', verifyToken, commentProxy);
router.delete('/:commentId', verifyToken, commentProxy);

module.exports = router;
