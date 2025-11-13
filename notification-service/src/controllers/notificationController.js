const notificationService = require('../services/notificationService');

class NotificationController {
    // GET /api/notifications - Lấy danh sách thông báo
    async getNotifications(req, res) {
        try {
            const userId = req.headers['x-user-id']; // Từ API Gateway
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized - User ID not found' });
            }
            
            const { category, isRead, page, limit } = req.query;

            const options = {
                category,
                isRead: isRead !== undefined ? isRead === 'true' : undefined,
                page: parseInt(page) || 1,
                limit: parseInt(limit) || 20
            };

            const result = await notificationService.getUserNotifications(userId, options);

            res.json(result);
        } catch (error) {
            console.error('Error getting notifications:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/notifications/unread-count - Lấy số thông báo chưa đọc
    async getUnreadCount(req, res) {
        try {
            const userId = req.headers['x-user-id']; // Từ API Gateway
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized - User ID not found' });
            }
            
            const { category } = req.query;

            const result = await notificationService.getUnreadCount(userId, category);

            res.json(result);
        } catch (error) {
            console.error('Error getting unread count:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // PUT /api/notifications/:id/read - Đánh dấu đã đọc
    async markAsRead(req, res) {
        try {
            const userId = req.headers['x-user-id']; // Từ API Gateway
            const { id } = req.params;
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized - User ID not found' });
            }

            const notification = await notificationService.markAsRead(id, userId);

            res.json(notification);
        } catch (error) {
            console.error('Error marking as read:', error);
            res.status(404).json({ error: error.message });
        }
    }

    // PUT /api/notifications/mark-all-read - Đánh dấu tất cả đã đọc
    async markAllAsRead(req, res) {
        try {
            const userId = req.headers['x-user-id']; // Từ API Gateway
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized - User ID not found' });
            }
            
            const { category } = req.query;

            const result = await notificationService.markAllAsRead(userId, category);

            res.json(result);
        } catch (error) {
            console.error('Error marking all as read:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // DELETE /api/notifications/:id - Xóa thông báo
    async deleteNotification(req, res) {
        try {
            const userId = req.headers['x-user-id']; // Từ API Gateway
            const { id } = req.params;
            
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized - User ID not found' });
            }

            await notificationService.deleteNotification(id, userId);

            res.json({ success: true, message: 'Notification deleted' });
        } catch (error) {
            console.error('Error deleting notification:', error);
            res.status(404).json({ error: error.message });
        }
    }

    // ============ INTERNAL APIs (được gọi từ các service khác) ============

    // POST /api/notifications/internal/recipe-update - Recipe service gọi
    async createRecipeUpdateNotification(req, res) {
        try {
            const { recipeId, recipeName, recipeImage, updateType, updateDetails } = req.body;

            const result = await notificationService.createRecipeUpdateNotification(
                recipeId,
                recipeName,
                recipeImage,
                updateType,
                updateDetails
            );

            res.json(result);
        } catch (error) {
            console.error('Error creating recipe update notification:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/notifications/internal/like - Like service gọi
    async createLikeNotification(req, res) {
        try {
            const { commentId, likedByUserId } = req.body;

            const result = await notificationService.createLikeNotification(commentId, likedByUserId);

            res.json(result);
        } catch (error) {
            console.error('Error creating like notification:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/notifications/internal/reply - Review service gọi
    async createReplyNotification(req, res) {
        try {
            const { parentCommentId, replyCommentId, repliedByUserId } = req.body;

            const result = await notificationService.createReplyNotification(
                parentCommentId,
                replyCommentId,
                repliedByUserId
            );

            res.json(result);
        } catch (error) {
            console.error('Error creating reply notification:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new NotificationController();
