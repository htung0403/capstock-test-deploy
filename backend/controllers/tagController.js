/*
  File: controllers/tagController.js
  Purpose: Handle API requests for managing article tags.
  Date: 2025-11-17
*/
const Tag = require('../models/Tag');

// @desc    Get all tags
// @route   GET /api/tags
// @access  Public (can be restricted if needed)
exports.getAllTags = async (req, res) => {
  try {
    const tags = await Tag.find();
    res.status(200).json(tags);
  } catch (error) {
    console.error('Error getting all tags:', error);
    res.status(500).json({ message: 'Failed to fetch tags.', error: error.message });
  }
};

// @desc    Create a new tag
// @route   POST /api/tags
// @access  Private (Admin, Editor, Writer)
exports.createTag = async (req, res) => {
  const { tag_name } = req.body;

  try {
    const tag = await Tag.create({ tag_name });
    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    res.status(500).json({ message: 'Failed to create tag.', error: error.message });
  }
};

// @desc    Update a tag
// @route   PUT /api/tags/:id
// @access  Private (Admin, Editor)
exports.updateTag = async (req, res) => {
  const { id } = req.params;
  const { tag_name } = req.body;

  try {
    const tag = await Tag.findById(id);

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    tag.tag_name = tag_name || tag.tag_name;
    await tag.save();
    res.status(200).json(tag);
  } catch (error) {
    console.error('Error updating tag:', error);
    res.status(500).json({ message: 'Failed to update tag.', error: error.message });
  }
};

// @desc    Delete a tag
// @route   DELETE /api/tags/:id
// @access  Private (Admin, Editor)
exports.deleteTag = async (req, res) => {
  const { id } = req.params;

  try {
    const tag = await Tag.findById(id);

    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }

    await tag.deleteOne(); // Use deleteOne() on the document
    res.status(200).json({ message: 'Tag removed' });
  } catch (error) {
    console.error('Error deleting tag:', error);
    res.status(500).json({ message: 'Failed to delete tag.', error: error.message });
  }
};
