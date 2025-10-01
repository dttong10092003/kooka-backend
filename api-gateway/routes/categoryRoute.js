const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const verifyToken = require("../middlewares/verifyToken");
const isAdmin = require("../middlewares/isAdmin");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyCategoryService = buildProxy(process.env.RECIPE_SERVICE_URL);

router.get("/", proxyCategoryService);
router.get("/:id", proxyCategoryService);
router.post("/", verifyToken, isAdmin, proxyCategoryService);
router.put("/:id", verifyToken, isAdmin, proxyCategoryService);
router.delete("/:id", verifyToken, isAdmin, proxyCategoryService);

module.exports = router;
