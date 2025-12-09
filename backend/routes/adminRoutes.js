/*
  File: routes/adminRoutes.js
  Purpose: Define API routes for Admins.
*/
const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware');
const adminController = require('../controllers/adminController');
const adminUserController = require('../controllers/adminUserController');

const router = express.Router();

// All admin routes require authentication and authorization as ADMIN
router.use(protect);
router.use(authorize(['ADMIN']));

router.delete('/article/:id', adminController.forceDeleteArticle);

// User Management Routes
router.get('/users', adminUserController.getAllUsers);
router.patch('/users/:id/roles', adminUserController.updateUserRoles);
router.patch('/users/:id/ban', adminUserController.updateUserBanStatus);

module.exports = router;

