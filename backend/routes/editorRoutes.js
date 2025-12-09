/*
  File: routes/editorRoutes.js
  Purpose: Define API routes for Editors to review and manage articles.
  Date: 2025-10-20
*/
const express = require('express');
const { protect, authorize } = require('../middlewares/authMiddleware'); // Assuming you have protect and authorize
const editorController = require('../controllers/editorController');

const router = express.Router();

// All editor routes require authentication and authorization as EDITOR or ADMIN
router.use(protect);
router.use(authorize(['EDITOR', 'ADMIN']));

router.get('/pending', editorController.getPendingArticles);
router.get('/delete-requests', editorController.getDeleteRequests);
router.get('/reviewed-by-me', editorController.getReviewedByMe);
router.put('/approve/:id', editorController.approveArticle);
router.put('/reject/:id', editorController.rejectArticle);
router.post('/delete-request/:id/approve', editorController.approveDeleteRequest);
router.post('/delete-request/:id/reject', editorController.rejectDeleteRequest);
router.get('/article/:id', editorController.getArticleForEditor);
router.put('/article/:id', editorController.editorUpdateArticle);

module.exports = router;
