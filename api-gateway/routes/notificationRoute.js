const express = require('express');
const router = express.Router();
const { createProxyMiddleware } = require('http-proxy-middleware');
const verifyToken = require('../middlewares/verifyToken');

const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3012';

// Tất cả routes cần authentication
router.use(verifyToken);

// Proxy to notification service
router.use('/', createProxyMiddleware({
    target: NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: {
        '^/api/notifications': '/api/notifications'
    },
    onProxyReq: (proxyReq, req) => {
        // Thêm userId vào header
        if (req.userId) {
            proxyReq.setHeader('x-user-id', req.userId);
        }
    }
}));

module.exports = router;
