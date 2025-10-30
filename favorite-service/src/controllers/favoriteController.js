const favoriteService = require('../services/favoriteService');

class FavoriteController {
    async toggleFavorite(req, res) {
        try {
            const { recipeId } = req.body;
            
            // Get userId from headers (set by API Gateway)
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            if (!recipeId) {
                return res.status(400).json({ 
                    error: 'recipeId is required' 
                });
            }

            const result = await favoriteService.toggleFavorite(recipeId, userId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getFavoriteCount(req, res) {
        try {
            const { recipeId } = req.params;
            const count = await favoriteService.getFavoriteCount(recipeId);
            res.json({ recipeId, count });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async checkUserFavorited(req, res) {
        try {
            const { recipeId, userId } = req.params;
            const result = await favoriteService.checkUserFavorited(recipeId, userId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getUserFavorites(req, res) {
        try {
            const { userId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await favoriteService.getUserFavorites(userId, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getRecipeFavorites(req, res) {
        try {
            const { recipeId } = req.params;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const result = await favoriteService.getRecipeFavorites(recipeId, page, limit);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async checkMultipleRecipes(req, res) {
        try {
            const { recipeIds } = req.body;
            const userId = req.headers['x-user-id'];

            if (!userId) {
                return res.status(401).json({ 
                    error: 'Unauthorized - User ID not found' 
                });
            }

            if (!recipeIds || !Array.isArray(recipeIds)) {
                return res.status(400).json({ 
                    error: 'recipeIds array is required' 
                });
            }

            const result = await favoriteService.checkMultipleRecipes(recipeIds, userId);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    async getMostFavoritedRecipes(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 5;
            const recipes = await favoriteService.getMostFavoritedRecipes(limit);
            res.json(recipes);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new FavoriteController();
