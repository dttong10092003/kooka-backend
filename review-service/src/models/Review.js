const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    recipeId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true
    },
    commentId: {
        type: String,
        required: true,
        unique: true // Mỗi comment chỉ có 1 review
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    }
}, {
    timestamps: true
});

// Index để query nhanh
reviewSchema.index({ recipeId: 1 });
reviewSchema.index({ userId: 1, recipeId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
