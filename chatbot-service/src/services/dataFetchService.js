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

  // Get Recipes by Difficulty
  async getRecipesByDifficulty(difficulty = 'Dễ', limit = 20) {
    try {
      // Get all recipes
      const response = await axios.get(`${this.recipeServiceUrl}/api/recipes?limit=100`);
      const recipes = Array.isArray(response.data) ? response.data : (response.data.recipes || []);
      
      if (recipes.length > 0) {
        // Normalize function to handle Vietnamese characters
        const normalize = (str) => {
          if (!str) return '';
          return str.toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .trim();
        };
        
        const normalizedDifficulty = normalize(difficulty);
        
        // Filter recipes by difficulty
        const filtered = recipes.filter(recipe => {
          if (!recipe.difficulty) return false;
          const normalizedRecipeDifficulty = normalize(recipe.difficulty);
          return normalizedRecipeDifficulty === normalizedDifficulty;
        });
        
        console.log(`Difficulty filter: "${difficulty}" -> Found ${filtered.length} recipes`);
        
        // Return filtered results (limited)
        return { recipes: filtered.slice(0, limit) };
      }
      return { recipes: [] };
    } catch (error) {
      console.error('Error fetching recipes by difficulty:', error.message);
      return null;
    }
  }

  // Get Recipes by Filters (advanced filtering)
  async getRecipesByFilters(filters = {}, limit = 20) {
    try {
      // Get all recipes
      const response = await axios.get(`${this.recipeServiceUrl}/api/recipes?limit=150`);
      const recipes = Array.isArray(response.data) ? response.data : (response.data.recipes || []);
      
      if (recipes.length === 0) {
        return { recipes: [] };
      }

      // Normalize function to handle Vietnamese characters
      const normalize = (str) => {
        if (!str) return '';
        return str.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
      };

      // Filter recipes based on multiple criteria
      let filtered = recipes.filter(recipe => {
        let match = true;

        // Filter by cuisine (country)
        if (filters.cuisine) {
          if (!recipe.cuisine || !recipe.cuisine.name) {
            match = false;
          } else {
            const normalizedCuisine = normalize(recipe.cuisine.name);
            const normalizedFilterCuisine = normalize(filters.cuisine);
            if (!normalizedCuisine.includes(normalizedFilterCuisine)) {
              match = false;
            }
          }
        }

        // Filter by category
        if (filters.category) {
          if (!recipe.category || !recipe.category.name) {
            match = false;
          } else {
            const normalizedCategory = normalize(recipe.category.name);
            const normalizedFilterCategory = normalize(filters.category);
            if (!normalizedCategory.includes(normalizedFilterCategory)) {
              match = false;
            }
          }
        }

        // Filter by time (cooking time)
        if (filters.maxTime && recipe.time) {
          if (recipe.time > filters.maxTime) {
            match = false;
          }
        }
        if (filters.minTime && recipe.time) {
          if (recipe.time < filters.minTime) {
            match = false;
          }
        }

        // Filter by calories
        if (filters.maxCalories && recipe.calories) {
          if (recipe.calories > filters.maxCalories) {
            match = false;
          }
        }
        if (filters.minCalories && recipe.calories) {
          if (recipe.calories < filters.minCalories) {
            match = false;
          }
        }

        // Filter by size (serving size)
        if (filters.size && recipe.size) {
          if (recipe.size !== filters.size) {
            match = false;
          }
        }

        // Filter by difficulty
        if (filters.difficulty && recipe.difficulty) {
          const normalizedDifficulty = normalize(recipe.difficulty);
          const normalizedFilterDifficulty = normalize(filters.difficulty);
          if (normalizedDifficulty !== normalizedFilterDifficulty) {
            match = false;
          }
        }

        // Filter by ingredients
        if (filters.ingredients && filters.ingredients.length > 0) {
          if (!recipe.ingredients || recipe.ingredients.length === 0) {
            match = false;
          } else {
            const recipeIngredientNames = recipe.ingredients.map(ing => 
              normalize(ing.name || '')
            );
            const hasAllIngredients = filters.ingredients.every(filterIng => {
              const normalizedFilterIng = normalize(filterIng);
              return recipeIngredientNames.some(recipeIng => 
                recipeIng.includes(normalizedFilterIng)
              );
            });
            if (!hasAllIngredients) {
              match = false;
            }
          }
        }

        return match;
      });

      console.log(`Filters applied:`, filters);
      console.log(`Found ${filtered.length} recipes matching criteria`);

      // Return filtered results (limited)
      return { recipes: filtered.slice(0, limit) };
    } catch (error) {
      console.error('Error fetching recipes by filters:', error.message);
      return null;
    }
  }
}

module.exports = new DataFetchService();
