const express = require('express');
const router = express.Router();
const proxyFactory = require('../utils/proxyFactory');

const viewProxy = proxyFactory('http://review-service:5007');

// ===== IMPORTANT: Thứ tự routes rất quan trọng! =====
// Các route CỤ THỂ phải đặt TRƯỚC các route có PARAMS

// ===== MONTHLY VIEWS ROUTES (đặt trước) =====
router.get('/monthly/total', viewProxy);
router.get('/monthly/top', viewProxy);
router.get('/monthly/stats', viewProxy);

// ===== GENERAL ROUTES =====
router.post('/batch', viewProxy);
router.get('/top', viewProxy);

// ===== RECIPE-SPECIFIC ROUTES (có :recipeId param, đặt cuối) =====
router.post('/:recipeId/increment', viewProxy);
router.get('/:recipeId/count', viewProxy);
router.get('/:recipeId/monthly', viewProxy);
router.get('/:recipeId/history', viewProxy);

module.exports = router;
