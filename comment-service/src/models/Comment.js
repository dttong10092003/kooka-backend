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
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    parentCommentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        default: null
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

module.exports = mongoose.model('Comment', commentSchema);
