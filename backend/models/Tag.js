const mongoose = require('mongoose');

const tagSchema = new mongoose.Schema({
  tag_name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
}, {
  timestamps: true,
});

const Tag = mongoose.model('Tag', tagSchema);
module.exports = Tag;
