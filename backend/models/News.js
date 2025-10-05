/*
  File: models/News.js
  Purpose: Define Mongoose schema for financial news articles stored in the system.
*/
const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: 
    { 
    type: String, 
    required: true, 
    trim: true 
    },
  content: 
    { 
    type: String, 
    required: true 
    },
  author: 
  { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
    },
  tags: [{ type: String, trim: true }],

  // ảnh minh họa
  image: { type: String }, // URL (cloudinary, s3, local...)

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('News', newsSchema);
