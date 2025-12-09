/*
  File: controllers/adminController.js
  Purpose: Handle API requests for Admins to manage all articles.
*/
const Article = require('../models/Article');

// Force delete any article (admin only)
const forceDeleteArticle = async (req, res) => {
  const { id } = req.params;

  try {
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }

    // Admin can delete any article regardless of status
    await article.deleteOne();
    res.status(200).json({ message: 'Article permanently deleted by admin' });
  } catch (error) {
    console.error('Error force deleting article:', error);
    res.status(500).json({ message: 'Failed to delete article.', error: error.message });
  }
};

module.exports = {
  forceDeleteArticle,
};

