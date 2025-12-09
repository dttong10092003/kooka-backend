const express = require("express");
const buildProxy = require("../utils/proxyFactory");
const dotenv = require("dotenv");
dotenv.config();

const router = express.Router();

const proxyChatbotService = buildProxy(process.env.CHATBOT_SERVICE_URL);

// Chatbot routes - proxy to chatbot-service
router.get("/health", proxyChatbotService);
router.post("/chat", proxyChatbotService);
router.get("/conversations", proxyChatbotService);
router.get("/history/:sessionId", proxyChatbotService);
router.delete("/history/:sessionId", proxyChatbotService);

module.exports = router;
