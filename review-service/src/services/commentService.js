const Comment = require('../models/Comment');
const reviewService = require('./reviewService');
const axios = require('axios');

// Notification service URL
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3012';

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

            // Reply không có rating
            commentData.ratingRecipe = null;
        } else {
            // Parent comment phải có rating
            if (!commentData.ratingRecipe || commentData.ratingRecipe < 1 || commentData.ratingRecipe > 5) {
                throw new Error('Parent comment must have a rating between 1 and 5');
            }
        }
        
        const comment = new Comment(commentData);
        const savedComment = await comment.save();

        // 🔔 Nếu là reply, gửi thông báo cho người được reply (không chờ)
        if (savedComment.parentCommentId) {
            this.sendReplyNotification(
                savedComment.parentCommentId.toString(),
                savedComment._id.toString(),
                savedComment.userId
            ).catch(err => {
                console.error('❌ Failed to send reply notification:', err.message);
            });
        }

        // Nếu là parent comment (có rating), tạo review
        if (savedComment.ratingRecipe && !savedComment.parentCommentId) {
            try {
                await reviewService.createReviewInternal({
                    recipeId: savedComment.recipeId,
                    userId: savedComment.userId,
                    commentId: savedComment._id.toString(),
                    rating: savedComment.ratingRecipe
                });
            } catch (error) {
                // Rollback: xóa comment nếu tạo review thất bại
                await Comment.deleteOne({ _id: savedComment._id });
                throw new Error('Failed to create review: ' + error.message);
            }
        }

        return savedComment;
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

        // Nếu là parent comment có rating, xóa review trước
        if (comment.ratingRecipe && !comment.parentCommentId) {
            try {
                await reviewService.deleteReviewInternal(commentId, userId);
            } catch (error) {
                console.error('Failed to delete review:', error.message);
                // Tiếp tục xóa comment ngay cả khi xóa review thất bại
            }
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

    async getTopComments(limit = 10) {
        const axios = require('axios');
        const RECIPE_SERVICE_URL = process.env.RECIPE_SERVICE_URL || 'http://recipe-service:5000';
        
        // Aggregation để tính số replies cho mỗi parent comment
        const topComments = await Comment.aggregate([
            // Chỉ lấy parent comments (không có parentCommentId)
            { $match: { parentCommentId: null } },
            
            // Lookup để đếm số replies
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'parentCommentId',
                    as: 'replies'
                }
            },
            
            // Thêm trường replyCount
            {
                $addFields: {
                    replyCount: { $size: '$replies' }
                }
            },
            
            // Sắp xếp theo likes giảm dần, nếu bằng nhau thì theo replyCount
            { $sort: { likes: -1, replyCount: -1 } },
            
            // Giới hạn số lượng
            { $limit: limit },
            
            // Loại bỏ trường replies khỏi kết quả (vì đã có replyCount)
            {
                $project: {
                    replies: 0
                }
            }
        ]);

        // Lấy thông tin recipe cho từng comment (chỉ lấy name, image và rating)
        const commentsWithRecipe = await Promise.all(
            topComments.map(async (comment) => {
                try {
                    const url = `${RECIPE_SERVICE_URL}/api/recipes/${comment.recipeId}`;
                    const recipeResponse = await axios.get(url);
                    
                    return {
                        ...comment,
                        recipe: {
                            _id: recipeResponse.data._id,
                            name: recipeResponse.data.name,
                            image: recipeResponse.data.image,
                            rate: recipeResponse.data.rate,
                            numberOfRate: recipeResponse.data.numberOfRate
                        }
                    };
                } catch (error) {
                    // Nếu recipe không tồn tại, vẫn trả về comment nhưng recipe = null
                    return {
                        ...comment,
                        recipe: null
                    };
                }
            })
        );

        return commentsWithRecipe;
    }

    async getNewestComments(limit = 5) {
        const axios = require('axios');
        const RECIPE_SERVICE_URL = process.env.RECIPE_SERVICE_URL || 'http://recipe-service:5000';
        
        // Aggregation để tính số replies cho mỗi parent comment
        const newestComments = await Comment.aggregate([
            // Chỉ lấy parent comments (không có parentCommentId)
            { $match: { parentCommentId: null } },
            
            // Lookup để đếm số replies
            {
                $lookup: {
                    from: 'comments',
                    localField: '_id',
                    foreignField: 'parentCommentId',
                    as: 'replies'
                }
            },
            
            // Thêm trường replyCount
            {
                $addFields: {
                    replyCount: { $size: '$replies' }
                }
            },
            
            // Sắp xếp theo thời gian tạo giảm dần (mới nhất trước)
            { $sort: { createdAt: -1 } },
            
            // Giới hạn số lượng
            { $limit: limit },
            
            // Loại bỏ trường replies khỏi kết quả (vì đã có replyCount)
            {
                $project: {
                    replies: 0
                }
            }
        ]);

        // Lấy thông tin recipe cho từng comment (chỉ lấy name, image và rating)
        const commentsWithRecipe = await Promise.all(
            newestComments.map(async (comment) => {
                try {
                    const url = `${RECIPE_SERVICE_URL}/api/recipes/${comment.recipeId}`;
                    const recipeResponse = await axios.get(url);
                    
                    return {
                        ...comment,
                        recipe: {
                            _id: recipeResponse.data._id,
                            name: recipeResponse.data.name,
                            image: recipeResponse.data.image,
                            rate: recipeResponse.data.rate,
                            numberOfRate: recipeResponse.data.numberOfRate
                        }
                    };
                } catch (error) {
                    // Nếu recipe không tồn tại, vẫn trả về comment nhưng recipe = null
                    return {
                        ...comment,
                        recipe: null
                    };
                }
            })
        );

        return commentsWithRecipe;
    }

    async sendReplyNotification(parentCommentId, replyCommentId, repliedByUserId) {
        try {
            await axios.post(`${NOTIFICATION_SERVICE_URL}/api/notifications/internal/reply`, {
                parentCommentId,
                replyCommentId,
                repliedByUserId
            });
            console.log(`✅ Sent reply notification for comment ${parentCommentId}`);
        } catch (error) {
            console.error(`❌ Failed to send reply notification:`, error.message);
            // Không throw error để không ảnh hưởng đến quá trình reply
        }
    }
}

module.exports = new CommentService();
