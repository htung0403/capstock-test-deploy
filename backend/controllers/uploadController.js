/*
  File: controllers/uploadController.js
  Purpose: Handle image uploads to Cloudinary.
  Date: 2025-12-01
*/
const { uploadToCloudinary } = require('../utils/cloudinary');

// Upload a single image
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const result = await uploadToCloudinary(req.file.buffer);
    
    res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error uploading image to Cloudinary',
      error: error.message 
    });
  }
};

module.exports = {
  uploadImage,
};

