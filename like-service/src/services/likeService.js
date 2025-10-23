const Like = require('../models/Like');
const axios = require('axios');

// Comment service URLs - now pointing to review-service
const COMMENT_SERVICE_URLS = [
    'http://review-service:5007',  // Docker
    'http://localhost:5007'         // Local
];

// Hàm update like count trong review-service
async function updateCommentLikeCount(commentId, likeCount) {
    for (const baseUrl of COMMENT_SERVICE_URLS) {
        try {
            await axios.patch(`${baseUrl}/api/comments/${commentId}/likes`, { likeCount });
            console.log(`✅ Updated like count for comment ${commentId}: ${likeCount}`);
            return;
        } catch (err) {
            console.error(`❌ Failed to update comment likes at ${baseUrl}:`, err.message);
        }
    }
    console.warn(`⚠️  Could not update like count for comment ${commentId}`);
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
