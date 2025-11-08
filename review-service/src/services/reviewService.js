const Review = require('../models/Review');
const axios = require('axios');

class ReviewService {
    // Internal method for creating review (called from commentService)
    async createReviewInternal(reviewData) {
        // Kiểm tra user đã review recipe này chưa
        const existingReview = await Review.findOne({
            userId: reviewData.userId,
            recipeId: reviewData.recipeId
        });

        if (existingReview) {
            throw new Error('User has already reviewed this recipe');
        }

        // Tạo review mới
        const review = new Review(reviewData);
        await review.save();

        // Cập nhật rating của recipe
        await this.updateRecipeRating(reviewData.recipeId);

        return review;
    }

    async createReview(reviewData) {
        return await this.createReviewInternal(reviewData);
    }

    async updateReview(commentId, userId, newRating) {
        const review = await Review.findOne({ commentId, userId });
        
        if (!review) {
            throw new Error('Review not found or unauthorized');
        }

        review.rating = newRating;
        await review.save();

        // Cập nhật lại rating của recipe
        await this.updateRecipeRating(review.recipeId);

        return review;
    }

    // Internal method for deleting review (called from commentService)
    async deleteReviewInternal(commentId, userId) {
        const review = await Review.findOne({ commentId, userId });
        
        if (!review) {
            throw new Error('Review not found or unauthorized');
        }

        const recipeId = review.recipeId;
        await Review.deleteOne({ _id: review._id });

        // Cập nhật lại rating của recipe
        await this.updateRecipeRating(recipeId);

        return { message: 'Review deleted successfully' };
    }

    async deleteReview(commentId, userId) {
        return await this.deleteReviewInternal(commentId, userId);
    }

    async getReviewByComment(commentId) {
        return await Review.findOne({ commentId });
    }

    async getReviewsByRecipe(recipeId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const reviews = await Review.find({ recipeId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Review.countDocuments({ recipeId });

        return {
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getUserReviewForRecipe(userId, recipeId) {
        return await Review.findOne({ userId, recipeId });
    }

    // Tính toán và cập nhật rating của recipe
    async updateRecipeRating(recipeId) {
        try {
            // Tính average rating
            const reviews = await Review.find({ recipeId });
            const numberOfRate = reviews.length;
            
            let rate = 0;
            if (numberOfRate > 0) {
                const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
                rate = totalRating / numberOfRate;
            }

            // Gọi API recipe-service để cập nhật
            const recipeServiceUrl = process.env.RECIPE_SERVICE_URL || 'http://recipe-service:5000';
            await axios.patch(`${recipeServiceUrl}/api/recipes/${recipeId}/rating`, {
                rate,
                numberOfRate
            });

            return { rate, numberOfRate };
        } catch (error) {
            console.error('Error updating recipe rating:', error.message);
            throw error;
        }
    }

    async getRecipeRatingStats(recipeId) {
        const reviews = await Review.find({ recipeId });
        const numberOfRate = reviews.length;
        
        let rate = 0;
        const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        
        if (numberOfRate > 0) {
            const totalRating = reviews.reduce((sum, review) => {
                ratingDistribution[review.rating]++;
                return sum + review.rating;
            }, 0);
            rate = totalRating / numberOfRate;
        }

        return {
            recipeId,
            averageRating: rate,
            totalReviews: numberOfRate,
            ratingDistribution
        };
    }

    async getReviewCount() {
        return await Review.countDocuments();
    }

    async getUserReviews(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const reviews = await Review.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Review.countDocuments({ userId });

        return {
            reviews,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
}

module.exports = new ReviewService();
