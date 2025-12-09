/*
  File: routes/trainingDataRoutes.js
  Purpose: Define API routes for training data management (admin only)
  Date: 2025-01-15
  
  CHANGES (2025-01-15):
  - Added upload-dataset endpoint with multer middleware
  - Added export endpoint for CSV download
*/
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const trainingDataController = require('../controllers/trainingDataController');
const { protect, admin } = require('../middlewares/authMiddleware');

// All routes require authentication and admin role
router.use(protect);
router.use(admin);

// Configure multer for file uploads
const uploadsDir = path.join(__dirname, '..', 'uploads', 'datasets');
// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `dataset-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedExtensions = ['.csv', '.xlsx', '.xls'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Training data CRUD operations
router.post('/', trainingDataController.createTrainingData);
router.get('/', trainingDataController.getTrainingData);
router.get('/stats', trainingDataController.getTrainingDataStats);
router.get('/export', trainingDataController.exportTrainingDataset); // Export endpoint (before /:id)
router.get('/:id', trainingDataController.getTrainingDataById);
router.put('/:id', trainingDataController.updateTrainingData);
router.delete('/:id', trainingDataController.deleteTrainingData);

// Verification operations
router.post('/:id/verify', trainingDataController.verifyTrainingData);
router.post('/:id/reject', trainingDataController.rejectTrainingData);

// Dataset upload endpoint (must be after /:id routes to avoid conflict)
router.post('/upload-dataset', upload.single('file'), trainingDataController.uploadTrainingDataset);

module.exports = router;

