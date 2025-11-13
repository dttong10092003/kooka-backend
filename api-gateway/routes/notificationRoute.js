const express = require('express');
const router = express.Router();
const { createProxyMiddleware } = require('http-proxy-middleware');
const verifyToken = require('../middlewares/verifyToken');

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3012';

// Apply authentication middleware cho tất cả routes
router.use(verifyToken);

// Proxy đến notification service
router.use('/', createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        // Forward x-user-id header từ API Gateway middleware
        if (req.headers['x-user-id']) {
            proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
    },
    onError: (err, req, res) => {
        console.error('❌ Notification proxy error:', err.message);
        res.status(503).json({ error: 'Notification service unavailable' });
    },
    logLevel: 'error'
}));

module.exports = router;
