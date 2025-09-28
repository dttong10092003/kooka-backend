const express = require("express");
const buildProxy = require("../utils/proxyFactory");
// const verifyToken = require("../middlewares/verifyToken");
// const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyIngredientService = buildProxy(process.env.RECIPE_SERVICE_URL);

router.get("/", proxyIngredientService);
router.get("/:id", proxyIngredientService);

module.exports = router;
