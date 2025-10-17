const Favorite = require('../models/Favorite');

class FavoriteService {
    async toggleFavorite(recipeId, userId) {
        try {
            // Check if favorite already exists
            const existingFavorite = await Favorite.findOne({ recipeId, userId });

            if (existingFavorite) {
                // Unfavorite - remove the favorite
                await Favorite.deleteOne({ recipeId, userId });
                const count = await this.getFavoriteCount(recipeId);
                
                return {
                    favorited: false,
                    message: 'Recipe removed from favorites successfully',
                    favorites: count
                };
            } else {
                // Favorite - add the favorite
                await Favorite.create({ recipeId, userId });
                const count = await this.getFavoriteCount(recipeId);
                
                return {
                    favorited: true,
                    message: 'Recipe added to favorites successfully',
                    favorites: count
                };
            }
        } catch (error) {
            throw new Error('Error toggling favorite: ' + error.message);
        }
    }

    async getFavoriteCount(recipeId) {
        return await Favorite.countDocuments({ recipeId });
    }

    async checkUserFavorited(recipeId, userId) {
        const favorite = await Favorite.findOne({ recipeId, userId });
        return {
            favorited: !!favorite,
            recipeId,
            userId
        };
    }

    async getUserFavorites(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const favorites = await Favorite.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Favorite.countDocuments({ userId });

        return {
            favorites,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async getRecipeFavorites(recipeId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const favorites = await Favorite.find({ recipeId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Favorite.countDocuments({ recipeId });

        return {
            favorites,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }

    async checkMultipleRecipes(recipeIds, userId) {
        const favorites = await Favorite.find({ 
            recipeId: { $in: recipeIds }, 
            userId 
        }).lean();

        const favoritedRecipeIds = favorites.map(f => f.recipeId);
        
        return recipeIds.map(recipeId => ({
            recipeId,
            favorited: favoritedRecipeIds.includes(recipeId)
        }));
    }
}

module.exports = new FavoriteService();
