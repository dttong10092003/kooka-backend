const Comment = require('../models/Comment');

class CommentService {
    async createComment(commentData) {
        const comment = new Comment(commentData);
        return await comment.save();
    }

    async getCommentsByRecipeId(recipeId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const comments = await Comment.find({ recipeId, parentCommentId: null })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Comment.countDocuments({ recipeId, parentCommentId: null });

        return {
            comments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getReplies(parentCommentId) {
        return await Comment.find({ parentCommentId })
            .sort({ createdAt: 1 })
            .lean();
    }

    async updateComment(commentId, userId, content) {
        const comment = await Comment.findOne({ _id: commentId, userId });
        
        if (!comment) {
            throw new Error('Comment not found or unauthorized');
        }

        comment.content = content;
        comment.isEdited = true;
        return await comment.save();
    }

    async deleteComment(commentId, userId) {
        const comment = await Comment.findOne({ _id: commentId, userId });
        
        if (!comment) {
            throw new Error('Comment not found or unauthorized');
        }

        // Delete the comment and all its replies
        await Comment.deleteMany({ parentCommentId: commentId });
        await Comment.deleteOne({ _id: commentId });
        
        return { message: 'Comment deleted successfully' };
    }

    async getCommentCount(recipeId) {
        return await Comment.countDocuments({ recipeId });
    }
}

module.exports = new CommentService();
