const express = require("express");
const buildProxy = require("../utils/proxyFactory");
// const verifyToken = require("../middlewares/verifyToken");
// const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyIngredientTypeService = buildProxy(process.env.RECIPE_SERVICE_URL);

router.get("/", proxyIngredientTypeService);
router.get("/:id", proxyIngredientTypeService);

module.exports = router;
