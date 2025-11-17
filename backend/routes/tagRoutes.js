/*
  File: routes/tagRoutes.js
  Purpose: Define API routes for managing article tags.
  Date: 2025-11-17
*/
const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { 
  getAllTags, 
  createTag, 
  updateTag, 
  deleteTag 
} = require('../controllers/tagController');

const router = express.Router();

// Public route to get all tags (can be accessed by any logged-in user)
router.get('/', protect, getAllTags); 

// Private routes for managing tags (Admin, Editor, Writer - create only)
router.post('/', protect, authorize(['ADMIN', 'EDITOR', 'WRITER']), createTag);
router.put('/:id', protect, authorize(['ADMIN', 'EDITOR']), updateTag);
router.delete('/:id', protect, authorize(['ADMIN', 'EDITOR']), deleteTag);

module.exports = router;
