/*
  File: routes/categoryRoutes.js
  Purpose: Define API routes for managing article categories.
  Date: 2025-11-17
*/
const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { 
  getAllCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory 
} = require('../controllers/categoryController');

const router = express.Router();

// Public route to get all categories (can be accessed by any logged-in user)
router.get('/', protect, getAllCategories); 

// Private routes for managing categories (Admin, Editor, Writer - create only)
router.post('/', protect, authorize(['ADMIN', 'EDITOR', 'WRITER']), createCategory);
router.put('/:id', protect, authorize(['ADMIN', 'EDITOR']), updateCategory);
router.delete('/:id', protect, authorize(['ADMIN', 'EDITOR']), deleteCategory);

module.exports = router;
