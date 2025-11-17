/*
  File: controllers/categoryController.js
  Purpose: Handle API requests for managing article categories.
  Date: 2025-11-17
*/
const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public (can be restricted if needed)
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error getting all categories:', error);
    res.status(500).json({ message: 'Failed to fetch categories.', error: error.message });
  }
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private (Admin, Editor, Writer)
exports.createCategory = async (req, res) => {
  const { category_name, parentId } = req.body;

  try {
    const category = await Category.create({ category_name, parentId });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ message: 'Failed to create category.', error: error.message });
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private (Admin, Editor)
exports.updateCategory = async (req, res) => {
  const { id } = req.params;
  const { category_name, parentId } = req.body;

  try {
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.category_name = category_name || category.category_name;
    category.parentId = parentId || category.parentId;
    await category.save();
    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ message: 'Failed to update category.', error: error.message });
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private (Admin, Editor)
exports.deleteCategory = async (req, res) => {
  const { id } = req.params;

  try {
    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.deleteOne(); // Use deleteOne() on the document
    res.status(200).json({ message: 'Category removed' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ message: 'Failed to delete category.', error: error.message });
  }
};
