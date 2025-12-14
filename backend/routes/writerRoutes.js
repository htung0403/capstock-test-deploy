/*
  File: routes/writerRoutes.js
  Purpose: Define API routes for Writers to manage their articles.
  Date: 2025-10-20
*/
const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware'); // Assuming you have protect and authorize
const writerController = require('../controllers/writerController');

const router = express.Router();

// All writer routes require authentication and authorization as WRITER or ADMIN
// Tạm thời vô hiệu hóa kiểm tra xác thực và vai trò cho phát triển và kiểm thử
// router.use(protect);
// router.use(authorize(['WRITER', 'ADMIN']));

router.post('/', writerController.createArticle);
router.get('/all-articles', protect, authorize(['ADMIN']), writerController.getAllArticles); // New route for admin
router.get('/:authorId', writerController.getWriterArticles);
router.get('/article/:id', writerController.getArticleById);
router.put('/article/:id', writerController.updateArticle);
router.post('/article/:id/submit', writerController.submitForReview); // Submit for review
router.post('/article/:id/request-delete', writerController.requestDelete); // Request delete for published
router.delete('/article/:id', writerController.deleteArticle); // Delete draft/pending/denied only

module.exports = router;
