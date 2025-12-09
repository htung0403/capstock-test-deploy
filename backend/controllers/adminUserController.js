/*
  File: controllers/adminUserController.js
  Purpose: Handle admin-only user management operations (list users, update roles, ban/unban).
*/
const asyncHandler = require('express-async-handler');
const User = require('../models/User');

/**
 * @desc Get paginated list of all users
 * @route GET /api/admin/users
 * @access Private/Admin
 */
exports.getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const skip = (page - 1) * limit;

  // Filter options
  const filter = {};
  if (req.query.role) {
    filter.roles = { $in: [req.query.role] };
  }
  if (req.query.banned !== undefined) {
    filter.isBanned = req.query.banned === 'true';
  }

  const users = await User.find(filter)
    .select('-password')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await User.countDocuments(filter);

  res.status(200).json({
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});

/**
 * @desc Update user roles
 * @route PATCH /api/admin/users/:id/roles
 * @access Private/Admin
 */
exports.updateUserRoles = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;

  if (!Array.isArray(roles)) {
    return res.status(400).json({ message: 'Roles must be an array' });
  }

  // Validate roles
  const validRoles = ['USER', 'WRITER', 'EDITOR', 'ADMIN'];
  const invalidRoles = roles.filter(r => !validRoles.includes(r));
  if (invalidRoles.length > 0) {
    return res.status(400).json({ message: `Invalid roles: ${invalidRoles.join(', ')}` });
  }

  // Prevent removing ADMIN role from yourself
  if (req.user.id === id && !roles.includes('ADMIN')) {
    return res.status(400).json({ message: 'Cannot remove ADMIN role from yourself' });
  }

  // Ensure USER role is always present
  const updatedRoles = roles.includes('USER') ? roles : ['USER', ...roles];

  const user = await User.findByIdAndUpdate(
    id,
    { 
      roles: updatedRoles,
      // Also update single role field for backward compatibility (use first non-USER role or ADMIN)
      role: updatedRoles.includes('ADMIN') ? 'ADMIN' : 
            updatedRoles.find(r => r !== 'USER') || 'USER',
    },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    message: 'User roles updated successfully',
    user,
  });
});

/**
 * @desc Ban or unban a user
 * @route PATCH /api/admin/users/:id/ban
 * @access Private/Admin
 */
exports.updateUserBanStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isBanned } = req.body;

  if (typeof isBanned !== 'boolean') {
    return res.status(400).json({ message: 'isBanned must be a boolean' });
  }

  // Prevent banning yourself
  if (req.user.id === id) {
    return res.status(400).json({ message: 'Cannot ban yourself' });
  }

  const user = await User.findByIdAndUpdate(
    id,
    { isBanned },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  res.status(200).json({
    message: `User ${isBanned ? 'banned' : 'unbanned'} successfully`,
    user,
  });
});

