const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxySearchService = buildProxy(process.env.PYTHON_COOK_SERVICE_URL);

router.post("/", proxySearchService);
router.post("/search-by-keyword", proxySearchService);

module.exports = router;
