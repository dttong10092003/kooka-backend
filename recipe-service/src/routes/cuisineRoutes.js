const express = require("express");
const router = express.Router();
const cuisineController = require("../controllers/cuisineController");

router.get("/", cuisineController.getCuisines);
router.get("/:id", cuisineController.getCuisine);
router.post("/", cuisineController.createCuisine);
router.put("/:id", cuisineController.updateCuisine);
router.delete("/:id", cuisineController.deleteCuisine);

module.exports = router;
