const tagService = require("../services/tagService");

exports.getTags = async (req, res) => {
  try {
    const tags = await tagService.getAllTags();
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getTag = async (req, res) => {
  try {
    const tag = await tagService.getTagById(req.params.id);
    if (!tag) return res.status(404).json({ message: "Tag not found" });
    res.json(tag);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createTag = async (req, res) => {
  try {
    const tag = await tagService.createTag(req.body);
    res.status(201).json(tag);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateTag = async (req, res) => {
  try {
    const tag = await tagService.updateTag(req.params.id, req.body);
    if (!tag) return res.status(404).json({ message: "Tag not found" });
    res.json(tag);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteTag = async (req, res) => {
  try {
    const tag = await tagService.deleteTag(req.params.id);
    if (!tag) return res.status(404).json({ message: "Tag not found" });
    res.json({ message: "Tag deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
