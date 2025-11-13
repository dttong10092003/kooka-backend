const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// ============ USER FACING ROUTES ============
// Authentication được handle bởi API Gateway, userId sẽ có trong headers['x-user-id']

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/mark-all-read', notificationController.markAllAsRead);
router.delete('/:id', notificationController.deleteNotification);

// ============ INTERNAL ROUTES ============
// Được gọi từ các service khác - không cần authentication

router.post('/internal/recipe-update', notificationController.createRecipeUpdateNotification);
router.post('/internal/like', notificationController.createLikeNotification);
router.post('/internal/reply', notificationController.createReplyNotification);

module.exports = router;
