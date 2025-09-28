// const express = require('express');
// const router = express.Router();
// const { createUserProxy } = require('../utils/proxyFactory');
// const verifyToken = require('../middlewares/verifyToken');

// // Create user service proxy
// const userProxy = createUserProxy();

// // All user routes require authentication
// // Profile routes
// router.post('/profile', verifyToken, userProxy);
// router.get('/profile/:userId', verifyToken, userProxy);
// router.put('/profile/:userId', verifyToken, userProxy);

// // Additional user routes (if you want to add more in the future)
// router.get('/me', verifyToken, (req, res, next) => {
//   // Add user ID from token to the request
//   req.url = `/profile/${req.user.userId || req.user.id}`;
//   userProxy(req, res, next);
// });

// // Health check removed to prevent request abort issues

// module.exports = router;