const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyRecipeService = buildProxy(process.env.RECIPE_SERVICE_URL);

// Public route - Lấy ingredient details của recipe/submission
router.get("/recipe/:recipeId", proxyRecipeService);

module.exports = router;
