const commentService = require('../services/commentService');
const { getUserInfo } = require('../utils/externalServices');

class CommentController {
    async createComment(req, res) {
        try {
            const { recipeId, content, parentCommentId } = req.body;
            
            // Get user ID from headers (set by API Gateway)
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            if (!recipeId || !content) {
                return res.status(400).json({ 
                    error: 'recipeId and content are required' 
                });
            }

            // Fetch username, firstName, lastName, and avatar from external services
            const userInfo = await getUserInfo(userId);

            const commentData = {
                recipeId,
                userId,
                userName: userInfo.username,
                firstName: userInfo.firstName,
                lastName: userInfo.lastName,
                userAvatar: userInfo.avatar,
                content,
                parentCommentId: parentCommentId || null
            };

            const comment = await commentService.createComment(commentData);
            res.status(201).json(comment);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getCommentsByRecipe(req, res) {
        try {
            const { recipeId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await commentService.getCommentsByRecipeId(recipeId, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getReplies(req, res) {
        try {
            const { commentId } = req.params;
            const replies = await commentService.getReplies(commentId);
            res.json(replies);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateComment(req, res) {
        try {
            const { commentId } = req.params;
            const { content } = req.body;
            
            // Get userId from headers (set by API Gateway)
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized - User ID not found' });
            }

            if (!content) {
                return res.status(400).json({ error: 'content is required' });
            }

            const comment = await commentService.updateComment(commentId, userId, content);
            res.json(comment);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    async deleteComment(req, res) {
        try {
            const { commentId } = req.params;
            
            // Get userId from headers (set by API Gateway)
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized - User ID not found' });
            }

            const result = await commentService.deleteComment(commentId, userId);
            res.json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    async getCommentCount(req, res) {
        try {
            const { recipeId } = req.params;
            const count = await commentService.getCommentCount(recipeId);
            res.json({ recipeId, count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async updateLikeCount(req, res) {
        try {
            const { commentId } = req.params;
            const { likeCount } = req.body;

            if (likeCount === undefined) {
                return res.status(400).json({ error: 'likeCount is required' });
            }

            const comment = await commentService.updateLikeCount(commentId, likeCount);
            res.json(comment);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new CommentController();
