/*
  File: routes/uploadRoutes.js
  Purpose: Define API routes for image uploads to Cloudinary.
  Date: 2025-12-01
*/
const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { upload } = require('../utils/cloudinary');
const uploadController = require('../controllers/uploadController');

const router = express.Router();

// Upload image route - requires authentication
// Temporarily disabled auth for development
// router.post('/image', protect, upload.single('image'), uploadController.uploadImage);
router.post('/image', upload.single('image'), uploadController.uploadImage);

module.exports = router;

