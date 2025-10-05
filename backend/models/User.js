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
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: ["USER", "ADMIN"],
    default: "USER",
  },
  balance: {
    type: Number,
    default: 0,
  },
  createdAt: {
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

// Instance method to compare password
UserSchema.methods.correctPassword = async function (candidatePassword, hashedPassword) {
  return bcrypt.compare(candidatePassword, hashedPassword);
};

module.exports = mongoose.model('User', UserSchema);
  