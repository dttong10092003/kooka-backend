const likeService = require('../services/likeService');

class LikeController {
    async toggleLike(req, res) {
        try {
            const { commentId } = req.body;
            
            // Get userId from headers (set by API Gateway)
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            if (!commentId) {
                return res.status(400).json({ 
                    error: 'commentId is required' 
                });
            }

            const result = await likeService.toggleLike(commentId, userId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getLikeCount(req, res) {
        try {
            const { commentId } = req.params;
            const count = await likeService.getLikeCount(commentId);
            res.json({ commentId, count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async checkUserLiked(req, res) {
        try {
            const { commentId, userId } = req.params;
            const result = await likeService.checkUserLiked(commentId, userId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserLikes(req, res) {
        try {
            const { userId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await likeService.getUserLikes(userId, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCommentLikes(req, res) {
        try {
            const { commentId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await likeService.getCommentLikes(commentId, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new LikeController();
