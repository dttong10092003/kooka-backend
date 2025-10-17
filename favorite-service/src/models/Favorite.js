const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
    recipeId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    }
}, {
    timestamps: true
});

// Compound unique index to prevent duplicate favorites
favoriteSchema.index({ recipeId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
