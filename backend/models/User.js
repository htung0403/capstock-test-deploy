/*
  File: models/User.js
  Purpose: Define Mongoose schema for users, with password hashing and role-based access fields.
*/
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, "Please use a valid email address."],
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
  },
  full_name: {
    type: String,
    default: "",
  },
  pen_name: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    enum: ["USER", "WRITER", "EDITOR", "ADMIN"],
    default: "USER",
  },
  // Support multiple roles (for users who can be both WRITER and EDITOR)
  roles: {
    type: [String],
    enum: ["USER", "WRITER", "EDITOR", "ADMIN"],
    default: ["USER"],
  },
  isBanned: {
    type: Boolean,
    default: false,
  },
  lastLogin: {
    type: Date,
    default: null,
  },
  resetPasswordToken: {
    type: String,
    default: null,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
  },
  refreshToken: {
    type: String,
    default: null,
    select: false, // Don't return by default
  },
  refreshTokenExpires: {
    type: Date,
    default: null,
  },
  balance: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Hash password if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Sync roles array with role field for backward compatibility
UserSchema.pre('save', function (next) {
  // If roles is empty or not set, initialize from role
  if (!this.roles || this.roles.length === 0) {
    this.roles = this.role ? [this.role] : ['USER'];
  }
  // If role is set but not in roles, add it
  if (this.role && !this.roles.includes(this.role)) {
    this.roles.push(this.role);
  }
  // Only ensure USER role if no other role is present (ADMIN, WRITER, EDITOR don't need USER)
  // ADMIN has all permissions, so it doesn't need USER role
  if (this.roles.length === 0) {
    this.roles = ['USER'];
  }
  next();
});

// Instance method to compare password
UserSchema.methods.correctPassword = async function (candidatePassword, hashedPassword) {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

module.exports = mongoose.model('User', UserSchema);
  