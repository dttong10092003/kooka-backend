const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyRecipeService = buildProxy(process.env.RECIPE_SERVICE_URL);

router.get("/", proxyRecipeService);
router.get("/:id", proxyRecipeService);
router.post("/", verifyToken, isAdmin, proxyRecipeService);
router.put("/:id", verifyToken, isAdmin, proxyRecipeService);
router.delete("/:id", verifyToken, isAdmin, proxyRecipeService);



module.exports = router;
