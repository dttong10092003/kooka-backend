const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// User-facing routes (authentication được handle bởi API Gateway)
router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// Internal routes (được gọi từ các service khác - không cần auth)
router.post('/internal/recipe-update', notificationController.createRecipeUpdateNotification);
router.post('/internal/like', notificationController.createLikeNotification);
router.post('/internal/reply', notificationController.createReplyNotification);

module.exports = router;
