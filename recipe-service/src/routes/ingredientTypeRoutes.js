const express = require("express");
const router = express.Router();
const typeController = require("../controllers/ingredientTypeController");

router.get("/", typeController.getTypes);
router.get("/:id", typeController.getType);
router.post("/", typeController.createType);
router.put("/:id", typeController.updateType);
router.delete("/:id", typeController.deleteType);

module.exports = router;
