const axios = require('axios');

class DataFetchService {
  constructor() {
    this.recipeServiceUrl = process.env.RECIPE_SERVICE_URL || 'http://localhost:5000';
    this.userServiceUrl = process.env.USER_SERVICE_URL || 'http://localhost:5002';
    this.reviewServiceUrl = process.env.REVIEW_SERVICE_URL || 'http://localhost:5007';
    this.pythonCookServiceUrl = process.env.PYTHON_COOK_SERVICE_URL || 'http://localhost:8000';
  }

  // Recipe Service Methods
  async getRecipes(limit = 10) {
    try {
      const response = await axios.get(`${this.recipeServiceUrl}/api/recipes?limit=${limit}`);
      // Recipe-service returns array directly
      const recipes = Array.isArray(response.data) ? response.data : (response.data.recipes || []);
      return { recipes };
    } catch (error) {
      console.error('Error fetching recipes:', error.message);
      return null;
    }
  }

  async getRecipeById(id) {
    try {
      const response = await axios.get(`${this.recipeServiceUrl}/api/recipes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching recipe by ID:', error.message);
      return null;
    }
  }

  async searchRecipes(query) {
    try {
      // Get all recipes and filter by name
      const response = await axios.get(`${this.recipeServiceUrl}/api/recipes?limit=50`);
      // Recipe-service returns array directly, not { recipes: [] }
      const recipes = Array.isArray(response.data) ? response.data : (response.data.recipes || []);
      
      if (recipes.length > 0) {
        // Normalize function to handle Vietnamese characters
        const normalize = (str) => {
          return str.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .trim();
        };
        
        const normalizedQuery = normalize(query);
        
        // Filter recipes by name matching query
        const filtered = recipes.filter(recipe => {
          if (!recipe.name) return false;
          const normalizedName = normalize(recipe.name);
          return normalizedName.includes(normalizedQuery);
        });
        
        console.log(`Search query: "${query}" -> Found ${filtered.length} recipes`);
        
        // Return filtered results
        return { recipes: filtered };
      }
      return { recipes: [] };
    } catch (error) {
      console.error('Error searching recipes:', error.message);
      return null;
    }
  }

  async getCategories() {
    try {
      const response = await axios.get(`${this.recipeServiceUrl}/api/categories`);
      return response.data;
    } catch (error) {
      console.error('Error fetching categories:', error.message);
      return null;
    }
  }

  async getCuisines() {
    try {
      const response = await axios.get(`${this.recipeServiceUrl}/api/cuisines`);
      return response.data;
    } catch (error) {
      console.error('Error fetching cuisines:', error.message);
      return null;
    }
  }

  async getIngredients() {
    try {
      const response = await axios.get(`${this.recipeServiceUrl}/api/ingredients`);
      return response.data;
    } catch (error) {
      console.error('Error fetching ingredients:', error.message);
      return null;
    }
  }

  async getTags() {
    try {
      const response = await axios.get(`${this.recipeServiceUrl}/api/tags`);
      return response.data;
    } catch (error) {
      console.error('Error fetching tags:', error.message);
      return null;
    }
  }

  async getRecipesByIngredients(ingredients) {
    try {
      const response = await axios.post(`${this.pythonCookServiceUrl}/api/recipes/by-ingredients`, {
        ingredients: ingredients
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recipes by ingredients:', error.message);
      return null;
    }
  }

  // Review Service Methods
  async getReviewsByRecipeId(recipeId) {
    try {
      const response = await axios.get(`${this.reviewServiceUrl}/api/reviews/recipe/${recipeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching reviews:', error.message);
      return null;
    }
  }

  async getCommentsByRecipeId(recipeId) {
    try {
      const response = await axios.get(`${this.reviewServiceUrl}/api/comments/recipe/${recipeId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching comments:', error.message);
      return null;
    }
  }

  // Advanced Search
  async advancedSearch(params) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const response = await axios.get(`${this.pythonCookServiceUrl}/api/search?${queryString}`);
      return response.data;
    } catch (error) {
      console.error('Error in advanced search:', error.message);
      return null;
    }
  }

  // Get Popular Recipes
  async getPopularRecipes(limit = 10) {
    try {
      const response = await axios.get(`${this.recipeServiceUrl}/api/recipes/popular?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching popular recipes:', error.message);
      return null;
    }
  }
}

module.exports = new DataFetchService();
