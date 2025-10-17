const express = require("express");
const router = express.Router();
const tagController = require("../controllers/tagController");

router.get("/", tagController.getTags);
router.get("/:id", tagController.getTag);
router.post("/", tagController.createTag);
router.put("/:id", tagController.updateTag);
router.delete("/:id", tagController.deleteTag);

module.exports = router;
