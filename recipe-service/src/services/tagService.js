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
  try {
    const tag = new Tag(data);
    return await tag.save();
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Thẻ "${data.name}" đã tồn tại`);
    }
    throw error;
  }
}

// Update
async function updateTag(id, data) {
  try {
    return await Tag.findByIdAndUpdate(id, data, { new: true });
  } catch (error) {
    if (error.code === 11000) {
      throw new Error(`Thẻ "${data.name}" đã tồn tại`);
    }
    throw error;
  }
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
