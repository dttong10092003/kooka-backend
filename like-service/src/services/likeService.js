const Like = require('../models/Like');

class LikeService {
    async toggleLike(commentId, userId) {
        try {
            // Check if like already exists
            const existingLike = await Like.findOne({ commentId, userId });

            if (existingLike) {
                // Unlike - remove the like
                await Like.deleteOne({ commentId, userId });
                const count = await this.getLikeCount(commentId);
                return {
                    liked: false,
                    message: 'Comment unliked successfully',
                    likeCount: count
                };
            } else {
                // Like - add the like
                await Like.create({ commentId, userId });
                const count = await this.getLikeCount(commentId);
                return {
                    liked: true,
                    message: 'Comment liked successfully',
                    likeCount: count
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
