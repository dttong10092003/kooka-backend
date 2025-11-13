const Like = require('../models/Like');
const axios = require('axios');

// Comment service URL - now pointing to review-service
const REVIEW_SERVICE_URL = process.env.REVIEW_SERVICE_URL || 'http://localhost:5007';

// Hàm update like count trong review-service
async function updateCommentLikeCount(commentId, likeCount) {
    try {
        await axios.patch(`${REVIEW_SERVICE_URL}/api/comments/${commentId}/likes`, { likeCount });
        console.log(`✅ Updated like count for comment ${commentId}: ${likeCount}`);
    } catch (err) {
        console.error(`❌ Failed to update comment likes at ${REVIEW_SERVICE_URL}:`, err.message);
        console.warn(`⚠️  Could not update like count for comment ${commentId}`);
    }
}

class LikeService {
    async toggleLike(commentId, userId) {
        try {
            // Check if like already exists
            const existingLike = await Like.findOne({ commentId, userId });

            if (existingLike) {
                // Unlike - remove the like
                await Like.deleteOne({ commentId, userId });
                const count = await this.getLikeCount(commentId);
                
                // Update like count in comment-service
                await updateCommentLikeCount(commentId, count);
                
                return {
                    liked: false,
                    message: 'Comment unliked successfully',
                    likes: count
                };
            } else {
                // Like - add the like
                await Like.create({ commentId, userId });
                const count = await this.getLikeCount(commentId);
                
                // Update like count in comment-service
                await updateCommentLikeCount(commentId, count);

                // Tạo thông báo cho người được like (không await để không block)
                this.createLikeNotification(commentId, userId).catch(err => {
                    console.error('❌ Failed to create like notification:', err.message);
                });
                
                return {
                    liked: true,
                    message: 'Comment liked successfully',
                    likes: count
                };
            }
        } catch (error) {
            throw new Error('Error toggling like: ' + error.message);
        }
    }

    // Gọi notification service để tạo thông báo
    async createLikeNotification(commentId, likedByUserId) {
        try {
            const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3012';
            await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/like`, {
                commentId,
                likedByUserId
            });
            console.log(`✅ Like notification sent for comment ${commentId}`);
        } catch (error) {
            console.error('❌ Error creating like notification:', error.message);
            // Không throw error để không ảnh hưởng đến flow chính
        }
    }

    async getLikeCount(commentId) {
        return await Like.countDocuments({ commentId });
    }

    async checkUserLiked(commentId, userId) {
        const like = await Like.findOne({ commentId, userId });
        return {
            liked: !!like,
            commentId,
            userId
        };
    }

    async getUserLikes(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const likes = await Like.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Like.countDocuments({ userId });

        return {
            likes,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getCommentLikes(commentId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const likes = await Like.find({ commentId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Like.countDocuments({ commentId });

        return {
            likes,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new LikeService();
