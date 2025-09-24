const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyPythonCookService = buildProxy(process.env.PYTHON_COOK_SERVICE_URL);

router.get("/search", proxyPythonCookService);

module.exports = router;
