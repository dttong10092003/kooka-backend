const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    commentId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate likes
likeSchema.index({ commentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Like', likeSchema);
