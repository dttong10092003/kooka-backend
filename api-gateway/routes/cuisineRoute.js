const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyCuisineService = buildProxy(process.env.RECIPE_SERVICE_URL);

router.get("/", proxyCuisineService);
router.get("/:id", proxyCuisineService);
router.post("/", verifyToken, isAdmin, proxyCuisineService);
router.put("/:id", verifyToken, isAdmin, proxyCuisineService);
router.delete("/:id", verifyToken, isAdmin, proxyCuisineService);

module.exports = router;
