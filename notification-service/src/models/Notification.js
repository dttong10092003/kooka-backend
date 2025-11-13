const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    type: {
        type: String,
        required: true,
        enum: [
            'RECIPE_UPDATE',        // Món ăn yêu thích có cập nhật
            'RECIPE_NEW_VIDEO',     // Món ăn yêu thích có video mới
            'RECIPE_INGREDIENTS',   // Món ăn yêu thích thay đổi nguyên liệu
            'REVIEW_LIKED',         // Review của bạn được like
            'REVIEW_REPLIED',       // Review của bạn được reply
            'COMMENT_LIKED',        // Comment của bạn được like
            'COMMENT_REPLIED'       // Comment của bạn được reply
        ]
    },
    category: {
        type: String,
        required: true,
        enum: ['RECIPE', 'COMMUNITY'], // Tab Công thức hoặc Cộng đồng
        default: 'RECIPE'
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    // Thông tin liên quan
    relatedRecipe: {
        recipeId: String,
        recipeName: String,
        recipeImage: String
    },
    relatedComment: {
        commentId: String,
        content: String
    },
    relatedUser: {
        userId: String,
        userName: String,
        userAvatar: String
    },
    // Link để navigate
    actionUrl: {
        type: String
    },
    isRead: {
        type: Boolean,
        default: false
    },
    // Metadata tùy chỉnh
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: true
});

// Indexes
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, category: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
