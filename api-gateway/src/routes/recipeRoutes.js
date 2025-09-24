const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const authMiddleware = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyRecipeService = buildProxy(process.env.RECIPE_SERVICE_URL);

router.get("/recipes", proxyRecipeService);
router.get("/recipes/:id", proxyRecipeService);
router.get("/ingredient-types", proxyRecipeService);
router.get("/ingredient-types/:id", proxyRecipeService);
router.get("/ingredients", proxyRecipeService);
router.get("/ingredients/:id", proxyRecipeService);

router.post("/recipes", authMiddleware, isAdmin, proxyRecipeService);
router.put("/recipes/:id", authMiddleware, isAdmin, proxyRecipeService);
router.delete("/recipes/:id", authMiddleware, isAdmin, proxyRecipeService);

module.exports = router;
