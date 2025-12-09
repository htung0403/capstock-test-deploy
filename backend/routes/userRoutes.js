/*
  File: routes/userRoutes.js
  Purpose: Define user-related API endpoints (register, login, profile get/update, password reset) and attach auth middleware where required.
*/
const express = require('express');
const { register, login, getProfile, updateProfile, forgotPassword, resetPassword } = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
