const reviewService = require('../services/reviewService');

class ReviewController {
    async createReview(req, res) {
        try {
            const { recipeId, commentId, rating } = req.body;
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            if (!recipeId || !commentId || !rating) {
                return res.status(400).json({ 
                    error: 'recipeId, commentId, and rating are required' 
                });
            }

            if (rating < 1 || rating > 5) {
                return res.status(400).json({ 
                    error: 'Rating must be between 1 and 5' 
                });
            }

            const reviewData = {
                recipeId,
                userId,
                commentId,
                rating: Number(rating)
            };

            const review = await reviewService.createReview(reviewData);
            res.status(201).json(review);
        } catch (error) {
            if (error.message === 'User has already reviewed this recipe') {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: error.message });
        }
    }

    async updateReview(req, res) {
        try {
            const { commentId } = req.params;
            const { rating } = req.body;
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            if (!rating) {
                return res.status(400).json({ 
                    error: 'rating is required' 
                });
            }

            if (rating < 1 || rating > 5) {
                return res.status(400).json({ 
                    error: 'Rating must be between 1 and 5' 
                });
            }

            const review = await reviewService.updateReview(commentId, userId, Number(rating));
            res.json(review);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    async deleteReview(req, res) {
        try {
            const { commentId } = req.params;
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            const result = await reviewService.deleteReview(commentId, userId);
            res.json(result);
        } catch (error) {
            res.status(404).json({ error: error.message });
        }
    }

    async getReviewByComment(req, res) {
        try {
            const { commentId } = req.params;
            const review = await reviewService.getReviewByComment(commentId);
            
            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }
            
            res.json(review);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getReviewsByRecipe(req, res) {
        try {
            const { recipeId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await reviewService.getReviewsByRecipe(recipeId, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserReviewForRecipe(req, res) {
        try {
            const { recipeId } = req.params;
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            const review = await reviewService.getUserReviewForRecipe(userId, recipeId);
            
            if (!review) {
                return res.status(404).json({ error: 'Review not found' });
            }
            
            res.json(review);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getRecipeRatingStats(req, res) {
        try {
            const { recipeId } = req.params;
            const stats = await reviewService.getRecipeRatingStats(recipeId);
            res.json(stats);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getReviewCount(req, res) {
        try {
            const count = await reviewService.getReviewCount();
            res.json({ count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserReviews(req, res) {
        try {
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await reviewService.getUserReviews(userId, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new ReviewController();
