/*
  File: routes/chatbotRoutes.js
  Purpose: Defines API routes for the AI chatbot functionality.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Added POST `/chat` route to handle user messages and return AI responses.
*/
const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

router.post('/chat', chatbotController.chat);

module.exports = router;
