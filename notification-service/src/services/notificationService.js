const Notification = require('../models/Notification');
const axios = require('axios');

class NotificationService {
    // ============ RECIPE NOTIFICATIONS (Tab Công thức) ============
    
    /**
     * Tạo thông báo khi món ăn yêu thích có cập nhật
     */
    async createRecipeUpdateNotification(recipeId, recipeName, recipeImage, updateType, updateDetails) {
        try {
            // Lấy danh sách user đã favorite món này
            const favoriteResponse = await axios.get(`http://favorite-service:3006/api/favorites/recipe/${recipeId}/users`);
            const userIds = favoriteResponse.data;

            if (!userIds || userIds.length === 0) {
                return { success: true, message: 'No users to notify' };
            }

            let title = '';
            let message = '';
            let type = '';

            switch (updateType) {
                case 'VIDEO':
                    type = 'RECIPE_NEW_VIDEO';
                    title = `${recipeName} có video hướng dẫn chi tiết`;
                    message = 'Xem ngay video mới nhất';
                    break;
                case 'INGREDIENTS':
                    type = 'RECIPE_INGREDIENTS';
                    title = `${recipeName} có meo hay được cập nhật`;
                    message = updateDetails || 'Công thức đã được cải tiến';
                    break;
                default:
                    type = 'RECIPE_UPDATE';
                    title = `${recipeName} vừa được thêm vào danh sách món ăn mới`;
                    message = updateDetails || 'Món ăn đã được cập nhật';
            }

            // Tạo thông báo cho tất cả user đã favorite
            const notifications = userIds.map(userId => ({
                userId,
                type,
                category: 'RECIPE',
                title,
                message,
                relatedRecipe: {
                    recipeId,
                    recipeName,
                    recipeImage
                },
                actionUrl: `/recipe/${recipeId}`,
                metadata: {
                    updateType,
                    updateDetails
                }
            }));

            await Notification.insertMany(notifications);

            return {
                success: true,
                message: `Sent ${notifications.length} notifications`,
                count: notifications.length
            };
        } catch (error) {
            console.error('Error creating recipe update notification:', error);
            throw error;
        }
    }

    // ============ COMMUNITY NOTIFICATIONS (Tab Cộng đồng) ============
    
    /**
     * Tạo thông báo khi review/comment được like
     */
    async createLikeNotification(commentId, likedByUserId) {
        try {
            // Lấy thông tin comment
            const commentResponse = await axios.get(`http://review-service:3008/api/comments/${commentId}`);
            const comment = commentResponse.data;

            // Không tự thông báo cho chính mình
            if (comment.userId === likedByUserId) {
                return { success: true, message: 'Self-like, no notification needed' };
            }

            // Lấy thông tin user đã like
            const userResponse = await axios.get(`http://user-service:3002/api/users/${likedByUserId}`);
            const likedByUser = userResponse.data;

            // Lấy thông tin recipe
            const recipeResponse = await axios.get(`http://recipe-service:3003/api/recipes/${comment.recipeId}`);
            const recipe = recipeResponse.data;

            const isReview = comment.ratingRecipe !== null && comment.ratingRecipe !== undefined;
            const type = isReview ? 'REVIEW_LIKED' : 'COMMENT_LIKED';

            const notification = new Notification({
                userId: comment.userId,
                type,
                category: 'COMMUNITY',
                title: isReview 
                    ? `${likedByUser.firstName} ${likedByUser.lastName} thích đánh giá của bạn`
                    : `${likedByUser.firstName} ${likedByUser.lastName} thích bình luận của bạn`,
                message: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
                relatedComment: {
                    commentId,
                    content: comment.content
                },
                relatedUser: {
                    userId: likedByUserId,
                    userName: likedByUser.userName || `${likedByUser.firstName} ${likedByUser.lastName}`,
                    userAvatar: likedByUser.avatar
                },
                relatedRecipe: {
                    recipeId: recipe._id,
                    recipeName: recipe.name,
                    recipeImage: recipe.image
                },
                actionUrl: `/recipe/${comment.recipeId}#comment-${commentId}`,
                metadata: {
                    isReview,
                    rating: comment.ratingRecipe
                }
            });

            await notification.save();

            return { success: true, notification };
        } catch (error) {
            console.error('Error creating like notification:', error);
            throw error;
        }
    }

    /**
     * Tạo thông báo khi review/comment được reply
     */
    async createReplyNotification(parentCommentId, replyCommentId, repliedByUserId) {
        try {
            // Lấy thông tin comment gốc
            const parentResponse = await axios.get(`http://review-service:3008/api/comments/${parentCommentId}`);
            const parentComment = parentResponse.data;

            // Không tự thông báo cho chính mình
            if (parentComment.userId === repliedByUserId) {
                return { success: true, message: 'Self-reply, no notification needed' };
            }

            // Lấy thông tin reply
            const replyResponse = await axios.get(`http://review-service:3008/api/comments/${replyCommentId}`);
            const replyComment = replyResponse.data;

            // Lấy thông tin user đã reply
            const userResponse = await axios.get(`http://user-service:3002/api/users/${repliedByUserId}`);
            const repliedByUser = userResponse.data;

            // Lấy thông tin recipe
            const recipeResponse = await axios.get(`http://recipe-service:3003/api/recipes/${parentComment.recipeId}`);
            const recipe = recipeResponse.data;

            const isReview = parentComment.ratingRecipe !== null && parentComment.ratingRecipe !== undefined;
            const type = isReview ? 'REVIEW_REPLIED' : 'COMMENT_REPLIED';

            const notification = new Notification({
                userId: parentComment.userId,
                type,
                category: 'COMMUNITY',
                title: isReview
                    ? `${repliedByUser.firstName} ${repliedByUser.lastName} đã phản hồi đánh giá của bạn`
                    : `${repliedByUser.firstName} ${repliedByUser.lastName} đã phản hồi bình luận của bạn`,
                message: replyComment.content.substring(0, 100) + (replyComment.content.length > 100 ? '...' : ''),
                relatedComment: {
                    commentId: replyCommentId,
                    content: replyComment.content
                },
                relatedUser: {
                    userId: repliedByUserId,
                    userName: repliedByUser.userName || `${repliedByUser.firstName} ${repliedByUser.lastName}`,
                    userAvatar: repliedByUser.avatar
                },
                relatedRecipe: {
                    recipeId: recipe._id,
                    recipeName: recipe.name,
                    recipeImage: recipe.image
                },
                actionUrl: `/recipe/${parentComment.recipeId}#comment-${replyCommentId}`,
                metadata: {
                    isReview,
                    parentCommentId,
                    rating: parentComment.ratingRecipe
                }
            });

            await notification.save();

            return { success: true, notification };
        } catch (error) {
            console.error('Error creating reply notification:', error);
            throw error;
        }
    }

    // ============ QUERY METHODS ============

    /**
     * Lấy danh sách thông báo của user
     */
    async getUserNotifications(userId, options = {}) {
        const {
            category,      // 'RECIPE' hoặc 'COMMUNITY'
            isRead,        // true/false/undefined (all)
            page = 1,
            limit = 20
        } = options;

        const query = { userId };
        
        if (category) {
            query.category = category;
        }
        
        if (isRead !== undefined) {
            query.isRead = isRead;
        }

        const skip = (page - 1) * limit;

        const [notifications, total, unreadCount] = await Promise.all([
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Notification.countDocuments(query),
            Notification.countDocuments({ userId, isRead: false })
        ]);

        return {
            notifications,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            },
            unreadCount
        };
    }

    /**
     * Đánh dấu thông báo đã đọc
     */
    async markAsRead(notificationId, userId) {
        const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            throw new Error('Notification not found or unauthorized');
        }

        return notification;
    }

    /**
     * Đánh dấu tất cả thông báo đã đọc
     */
    async markAllAsRead(userId, category) {
        const query = { userId, isRead: false };
        
        if (category) {
            query.category = category;
        }

        const result = await Notification.updateMany(query, { isRead: true });

        return {
            success: true,
            modifiedCount: result.modifiedCount
        };
    }

    /**
     * Xóa thông báo
     */
    async deleteNotification(notificationId, userId) {
        const result = await Notification.findOneAndDelete({
            _id: notificationId,
            userId
        });

        if (!result) {
            throw new Error('Notification not found or unauthorized');
        }

        return { success: true };
    }

    /**
     * Lấy số lượng thông báo chưa đọc
     */
    async getUnreadCount(userId, category) {
        const query = { userId, isRead: false };
        
        if (category) {
            query.category = category;
        }

        const count = await Notification.countDocuments(query);

        return { unreadCount: count };
    }
}

module.exports = new NotificationService();
