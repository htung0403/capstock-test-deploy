/*
  File: controllers/userController.js
  Purpose: Handle user operations: register, login (issue JWT), get profile, update profile, and password reset.
*/
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { sendPasswordResetEmail } = require('../services/emailService');
const asyncHandler = require('express-async-handler');

// Đăng ký
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ========== INPUT VALIDATION ==========
    if (!username || !email || !password) {
      return res.status(400).json({
        message: 'Username, email, and password are required',
        status: 'error',
      });
    }

    // Normalize inputs
    const normalizedUsername = username.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    // Username validation
    if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
      return res.status(400).json({
        message: 'Username must be between 3 and 30 characters',
        status: 'error',
      });
    }

    // Username format validation (alphanumeric, underscore, hyphen only)
    if (!/^[a-zA-Z0-9_-]+$/.test(normalizedUsername)) {
      return res.status(400).json({
        message: 'Username can only contain letters, numbers, underscores, and hyphens',
        status: 'error',
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please provide a valid email address',
        status: 'error',
      });
    }

    // Password strength validation
    if (trimmedPassword.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long',
        status: 'error',
      });
    }

    if (trimmedPassword.length > 128) {
      return res.status(400).json({
        message: 'Password must be less than 128 characters',
        status: 'error',
      });
    }

    // Check for common weak passwords (optional but recommended)
    const commonPasswords = ['password', '12345678', 'qwerty', 'abc123', 'password123'];
    if (commonPasswords.includes(trimmedPassword.toLowerCase())) {
      return res.status(400).json({
        message: 'Password is too common. Please choose a stronger password',
        status: 'error',
      });
    }

    // ========== DUPLICATE CHECK ==========
    // Check if username already exists (case-insensitive check)
    const existingUsername = await User.findOne({
      $or: [
        { username: normalizedUsername },
        { username: new RegExp(`^${normalizedUsername}$`, 'i') }
      ]
    });
    if (existingUsername) {
      return res.status(400).json({
        message: 'Username already exists. Please choose a different username.',
        status: 'error',
      });
    }

    // Check if email already exists
    const existingEmail = await User.findOne({ email: normalizedEmail });
    if (existingEmail) {
      // Check if the existing email belongs to a banned account
      if (existingEmail.isBanned) {
        return res.status(403).json({
          message: 'This email is associated with a banned account. Please contact administrator.',
          status: 'error',
        });
      }
      return res.status(400).json({
        message: 'Email already registered. Please use a different email or try logging in.',
        status: 'error',
      });
    }

    // ========== CREATE USER ==========
    // Use findOneAndUpdate with upsert to prevent race condition
    // But since we need to create new user, use create with proper error handling
    const user = await User.create({
      username: normalizedUsername,
      email: normalizedEmail,
      password: trimmedPassword, // Will be hashed by pre-save hook
    });

    // ========== RESPONSE ==========
    // Remove sensitive fields from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.status(201).json({
      message: 'Account created successfully',
      status: 'success',
      user: userResponse,
    });
  } catch (err) {
    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message).join(', ');
      return res.status(400).json({
        message: messages,
        status: 'error',
      });
    }

    // Handle duplicate key errors (race condition fallback)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      if (field === 'username') {
        return res.status(400).json({
          message: 'Username already exists. Please choose a different username.',
          status: 'error',
        });
      }
      if (field === 'email') {
        return res.status(400).json({
          message: 'Email already registered. Please use a different email or try logging in.',
          status: 'error',
        });
      }
      return res.status(400).json({
        message: `${field} already exists`,
        status: 'error',
      });
    }

    console.error('Registration error:', err);
    res.status(500).json({
      message: 'Registration failed. Please try again later.',
      status: 'error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Đăng nhập
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // ========== INPUT VALIDATION ==========
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        status: 'error',
      });
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        message: 'Please provide a valid email address',
        status: 'error',
      });
    }

    // ========== FIND USER ==========
    const user = await User.findOne({ email: normalizedEmail });

    // ========== TIMING ATTACK PROTECTION ==========
    // Always perform password comparison to prevent timing attacks
    // Use a dummy hash if user doesn't exist
    const dummyHash = '$2a$10$dummyhashfordummycomparison1234567890123456789012';
    const passwordToCompare = user ? user.password : dummyHash;
    
    // Perform password comparison (always takes same time regardless of user existence)
    let isPasswordValid = false;
    if (user) {
      isPasswordValid = await user.correctPassword(trimmedPassword, user.password);
    } else {
      // Perform dummy comparison to maintain constant timing
      await bcrypt.compare(trimmedPassword, dummyHash);
    }

    // ========== AUTHENTICATION CHECK ==========
    if (!user || !isPasswordValid) {
      // Add small random delay to prevent timing attacks (optional but recommended)
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100 + 50));
      
      return res.status(401).json({
        message: 'Invalid email or password',
        status: 'error',
      });
    }

    // ========== ACCOUNT STATUS CHECK ==========
    if (user.isBanned) {
      return res.status(403).json({
        message: 'Account is banned. Please contact administrator.',
        status: 'error',
      });
    }

    // ========== UPDATE LAST LOGIN ==========
    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    // ========== GENERATE JWT TOKEN ==========
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // ========== PREPARE RESPONSE ==========
    // Remove sensitive fields from user object
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.resetPasswordToken;
    delete userResponse.resetPasswordExpires;

    res.status(200).json({
      message: 'Login successful',
      status: 'success',
      token,
      user: userResponse,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({
      message: 'Login failed. Please try again later.',
      status: 'error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// Lấy profile
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  res.json(user);
};

// Update profile
exports.updateProfile = async (req, res) => {
  const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
  res.json(user);
};

/**
 * @desc Request password reset (send email with reset token)
 * @route POST /api/users/forgot-password
 * @access Public
 */
exports.forgotPassword = asyncHandler(async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        status: 'error',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    // Always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({
        message: 'If an account with that email exists, a password reset link has been sent.',
        status: 'success',
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        message: 'Account is banned. Cannot reset password.',
        status: 'error',
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set token and expiry (1 hour from now)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    // Send email
    const emailSent = await sendPasswordResetEmail(user.email, resetToken, resetUrl);
    
    if (!emailSent || !emailSent.success) {
      // If email fails, clear the token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      return res.status(500).json({
        message: 'Không thể gửi email xác thực. Vui lòng thử lại sau.',
        status: 'error',
      });
    }

    res.status(200).json({
      message: 'If an account with that email exists, a password reset link has been sent.',
      status: 'success',
    });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({
      message: 'Có lỗi xảy ra. Vui lòng thử lại sau.',
      status: 'error',
      error: err.message,
    });
  }
});

/**
 * @desc Reset password with token
 * @route POST /api/users/reset-password
 * @access Public
 */
exports.resetPassword = asyncHandler(async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: 'Token and password are required',
        status: 'error',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters',
        status: 'error',
      });
    }

    // Hash the token to compare with stored hash
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: Date.now() }, // Token not expired
    });

    if (!user) {
      return res.status(400).json({
        message: 'Mã xác thực không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu đặt lại mật khẩu mới.',
        status: 'error',
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      return res.status(403).json({
        message: 'Account is banned. Cannot reset password.',
        status: 'error',
      });
    }

    // Update password (Mongoose pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      message: 'Mật khẩu đã được cập nhật thành công',
      status: 'success',
    });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({
      message: 'Có lỗi xảy ra khi đặt lại mật khẩu',
      status: 'error',
      error: err.message,
    });
  }
});
