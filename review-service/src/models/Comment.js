const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    recipeId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    firstName: {
        type: String,
        default: ''
    },
    lastName: {
        type: String,
        default: ''
    },
    userAvatar: {
        type: String,
        default: null
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    likes: {
        type: Number,
        default: 0
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
    },
    ratingRecipe: {
        type: Number,
        min: 1,
        max: 5,
        default: null // Chỉ parent comment mới có rating, reply thì null
    },
    isEdited: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
commentSchema.index({ recipeId: 1, createdAt: -1 });
commentSchema.index({ parentCommentId: 1 }); // Index for nested replies query

module.exports = mongoose.model('Comment', commentSchema);
