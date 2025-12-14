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

// Helper function to normalize tag name
const normalizeTagName = (tagName) => {
  if (!tagName || typeof tagName !== 'string') {
    return null;
  }
  // Trim, lowercase, remove special characters (keep only alphanumeric, spaces, hyphens, underscores)
  return tagName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s\-_]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
};

// @desc    Create a new tag
// @route   POST /api/tags
// @access  Private (Admin, Editor, Writer)
exports.createTag = async (req, res) => {
  const { tag_name } = req.body;

  if (!tag_name || typeof tag_name !== 'string' || !tag_name.trim()) {
    return res.status(400).json({ message: 'Tag name is required' });
  }

  // Normalize tag name
  const normalizedTagName = normalizeTagName(tag_name);
  
  if (!normalizedTagName || normalizedTagName.length < 2) {
    return res.status(400).json({ message: 'Tag name must be at least 2 characters after normalization' });
  }

  if (normalizedTagName.length > 50) {
    return res.status(400).json({ message: 'Tag name must be less than 50 characters' });
  }

  try {
    // Check if tag already exists (case-insensitive)
    const existingTag = await Tag.findOne({ 
      tag_name: new RegExp(`^${normalizedTagName}$`, 'i') 
    });

    if (existingTag) {
      return res.status(200).json(existingTag); // Return existing tag instead of error
    }

    const tag = await Tag.create({ tag_name: normalizedTagName });
    res.status(201).json(tag);
  } catch (error) {
    console.error('Error creating tag:', error);
    if (error.code === 11000) {
      // Duplicate key error
      const existingTag = await Tag.findOne({ tag_name: normalizedTagName });
      if (existingTag) {
        return res.status(200).json(existingTag);
      }
    }
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
