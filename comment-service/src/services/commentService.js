const Comment = require('../models/Comment');

class CommentService {
    async createComment(commentData) {
        // Validate parentCommentId exists if provided (for replies)
        if (commentData.parentCommentId) {
            const parentComment = await Comment.findById(commentData.parentCommentId);
            if (!parentComment) {
                throw new Error('Parent comment not found');
            }
            
            // Ensure reply is attached to root comment (2-level only)
            // If replying to a reply, use the reply's parentCommentId instead
            if (parentComment.parentCommentId) {
                commentData.parentCommentId = parentComment.parentCommentId;
            }
        }
        
        const comment = new Comment(commentData);
        return await comment.save();
    }

    async getCommentsByRecipeId(recipeId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        // Lấy parent comments
        const parentComments = await Comment.find({ recipeId, parentCommentId: null })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Lấy tất cả replies cho các parent comments này
        const parentIds = parentComments.map(c => c._id);
        const replies = await Comment.find({ 
            parentCommentId: { $in: parentIds } 
        })
            .sort({ createdAt: 1 })
            .lean();

        // Group replies theo parentCommentId
        const repliesMap = {};
        replies.forEach(reply => {
            const parentId = reply.parentCommentId.toString();
            if (!repliesMap[parentId]) {
                repliesMap[parentId] = [];
            }
            repliesMap[parentId].push(reply);
        });

        // Attach replies vào parent comments
        const commentsWithReplies = parentComments.map(comment => ({
            ...comment,
            replies: repliesMap[comment._id.toString()] || []
        }));

        const totalParents = await Comment.countDocuments({ recipeId, parentCommentId: null });
        const totalAll = await Comment.countDocuments({ recipeId }); // Bao gồm cả replies

        return {
            comments: commentsWithReplies,
            total: totalAll, // Frontend expect total bao gồm cả replies
            pagination: {
                page,
                limit,
                total: totalParents,
                pages: Math.ceil(totalParents / limit)
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

    async updateLikeCount(commentId, likeCount) {
        const comment = await Comment.findByIdAndUpdate(
            commentId,
            { likes: likeCount },
            { new: true }
        );
        
        if (!comment) {
            throw new Error('Comment not found');
        }
        
        return comment;
    }
}

module.exports = new CommentService();
