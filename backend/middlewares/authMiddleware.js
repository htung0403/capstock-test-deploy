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
    // Check if JWT_SECRET is configured
    if (!process.env.JWT_SECRET) {
      console.error('ERROR: JWT_SECRET is not set in environment variables!');
      return res.status(500).json({ 
        message: 'Server configuration error. Please contact administrator.',
        error: 'JWT_SECRET not configured'
      });
    }

    // Try to get token from cookie first (httpOnly), then from Authorization header (for backward compatibility)
    let token = req.cookies?.accessToken;
    
    if (!token) {
      // Fallback to Authorization header for backward compatibility
      const authHeader = req.headers.authorization || '';
      token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    }

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      // Handle specific JWT errors
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token has expired. Please login again.',
          error: 'TokenExpiredError'
        });
      }
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          message: 'Invalid token. Please login again.',
          error: 'InvalidToken'
        });
      }
      throw jwtError; // Re-throw unknown errors
    }

    if (!decoded?.id || !mongoose.Types.ObjectId.isValid(decoded.id)) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({ message: 'Account is banned. Please contact administrator.' });
    }

    req.user = { 
      id: user._id.toString(), 
      role: user.role,
      roles: user.roles || [user.role || 'USER'],
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
};

// Chỉ cho phép các vai trò được chỉ định
exports.authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Check if user has any of the required roles
    const userRoles = req.user.roles || [req.user.role];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      console.log('[AuthMiddleware] Authorization failed:', {
        requiredRoles: roles,
        userRoles: userRoles,
        userId: req.user.id,
      });
      return res.status(403).json({ 
        message: 'Forbidden - Insufficient role',
        required: roles,
        current: userRoles,
      });
    }
    next();
  };
};

// Admin-only access
exports.admin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const userRoles = req.user.roles || [req.user.role];
  if (!userRoles.includes('ADMIN')) {
    return res.status(403).json({ message: 'Forbidden - Admin access required' });
  }
  next();
}; 