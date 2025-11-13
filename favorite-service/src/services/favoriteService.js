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

    async getMostFavoritedRecipes(limit = 5) {
        const axios = require('axios');
        const RECIPE_SERVICE_URL = process.env.RECIPE_SERVICE_URL || 'http://recipe-service:5000';

        // Aggregation để đếm số lượt favorite cho mỗi recipe
        const topFavorites = await Favorite.aggregate([
            // Group theo recipeId và đếm số lượng
            {
                $group: {
                    _id: '$recipeId',
                    favoriteCount: { $sum: 1 }
                }
            },
            // Sắp xếp theo số lượt favorite giảm dần
            { $sort: { favoriteCount: -1 } },
            // Giới hạn số lượng
            { $limit: limit }
        ]);

        // Lấy thông tin recipe cho từng recipeId (chỉ lấy name, image và rating)
        const recipesWithFavorites = await Promise.all(
            topFavorites.map(async (item) => {
                try {
                    const url = `${RECIPE_SERVICE_URL}/api/recipes/${item._id}`;
                    const recipeResponse = await axios.get(url);
                    
                    return {
                        _id: recipeResponse.data._id,
                        name: recipeResponse.data.name,
                        image: recipeResponse.data.image,
                        rate: recipeResponse.data.rate,
                        numberOfRate: recipeResponse.data.numberOfRate,
                        favoriteCount: item.favoriteCount
                    };
                } catch (error) {
                    // Nếu recipe không tồn tại, trả về null
                    return null;
                }
            })
        );

        // Filter ra những recipe hợp lệ
        return recipesWithFavorites.filter(recipe => recipe !== null);
    }

    // 🔔 Get all userIds who favorited a recipe (for notification-service)
    async getUserIdsByRecipe(recipeId) {
        const favorites = await Favorite.find({ recipeId })
            .select('userId')
            .lean();
        
        return favorites.map(f => f.userId);
    }
}

module.exports = new FavoriteService();
