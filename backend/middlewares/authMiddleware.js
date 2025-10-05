/*
  File: middlewares/authMiddleware.js
  Purpose: Provide authentication and authorization middlewares (JWT protect and admin-only access) for securing routes.
*/
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');

// Xác thực người dùng qua Bearer token
exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = { id: user._id.toString(), role: user.role };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
};

// Chỉ cho phép admin
exports.admin = (req, res, next) => {
  if (req.user?.role === 'ADMIN') return next();
  return res.status(403).json({ message: 'Admin only' });
}; 