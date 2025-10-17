const Tag = require("../models/Tag");

// Get all
async function getAllTags() {
  return await Tag.find();
}

// Get by id
async function getTagById(id) {
  return await Tag.findById(id);
}

// Create
async function createTag(data) {
  const tag = new Tag(data);
  return await tag.save();
}

// Update
async function updateTag(id, data) {
  return await Tag.findByIdAndUpdate(id, data, { new: true });
}

// Delete
async function deleteTag(id) {
  return await Tag.findByIdAndDelete(id);
}

module.exports = {
  getAllTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
};
