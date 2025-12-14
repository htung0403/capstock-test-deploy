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

// Helper function to normalize category name
const normalizeCategoryName = (categoryName) => {
  if (!categoryName || typeof categoryName !== 'string') {
    return null;
  }
  // Trim, keep first letter uppercase, remove special characters
  return categoryName
    .trim()
    .replace(/[^a-zA-Z0-9\s\-_]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/^\w/, c => c.toUpperCase()); // Capitalize first letter
};

// @desc    Create a new category
// @route   POST /api/categories
// @access  Private (Admin, Editor, Writer)
exports.createCategory = async (req, res) => {
  const { category_name, parentId } = req.body;

  if (!category_name || typeof category_name !== 'string' || !category_name.trim()) {
    return res.status(400).json({ message: 'Category name is required' });
  }

  // Normalize category name
  const normalizedCategoryName = normalizeCategoryName(category_name);
  
  if (!normalizedCategoryName || normalizedCategoryName.length < 2) {
    return res.status(400).json({ message: 'Category name must be at least 2 characters after normalization' });
  }

  if (normalizedCategoryName.length > 100) {
    return res.status(400).json({ message: 'Category name must be less than 100 characters' });
  }

  try {
    // Check if category already exists (case-insensitive)
    const existingCategory = await Category.findOne({ 
      category_name: new RegExp(`^${normalizedCategoryName}$`, 'i') 
    });

    if (existingCategory) {
      return res.status(200).json(existingCategory); // Return existing category instead of error
    }

    const category = await Category.create({ 
      category_name: normalizedCategoryName, 
      parentId: parentId || null 
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    if (error.code === 11000) {
      // Duplicate key error
      const existingCategory = await Category.findOne({ category_name: normalizedCategoryName });
      if (existingCategory) {
        return res.status(200).json(existingCategory);
      }
    }
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
