const express = require('express');
const router = express.Router();
const { createAuthProxy } = require('../utils/proxyFactory');
const verifyToken = require('../middlewares/verifyToken');
const isAdmin = require('../middlewares/isAdmin');

// Create auth service proxy
const authProxy = createAuthProxy();

// Public routes (no authentication required)
router.post('/register', authProxy);
router.post('/login', authProxy);

// Google OAuth routes
router.get('/google', authProxy);
router.get('/google/callback', authProxy);
router.get('/success', authProxy);
router.get('/failure', authProxy);

// Protected routes (authentication required)
router.post('/change-password', verifyToken, authProxy);

// Admin only routes
router.post('/create-admin', isAdmin, authProxy);

// Health check removed to prevent request abort issues

module.exports = router;