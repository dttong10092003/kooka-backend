const express = require('express');
const router = express.Router();
const proxyFactory = require('../utils/proxyFactory');
const verifyToken = require('../middlewares/verifyToken');

const likeProxy = proxyFactory(process.env.LIKE_SERVICE_URL);

// Public routes (no authentication required)
router.get('/comment/:commentId/count', likeProxy);
router.get('/comment/:commentId/user/:userId', likeProxy);
router.get('/user/:userId', likeProxy);
router.get('/comment/:commentId', likeProxy);

// Protected routes (authentication required)
router.post('/toggle', verifyToken, likeProxy);

module.exports = router;
