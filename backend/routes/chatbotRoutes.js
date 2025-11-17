/*
  File: routes/chatbotRoutes.js
  Purpose: Defines API routes for the AI chatbot functionality.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Added POST `/chat` route to handle user messages and return AI responses.

  CHANGES (2025-11-—): (LEVEL 4 UPGRADE — Auto Multi-Language Ready)
  - Added lightweight rate limiter to prevent spam requests.
  - Added detailed comments to explain route behavior.
  - Prepared route structure for future multi-mode chat (GPT, Claude, RAG).
*/

const express = require('express');
const router = express.Router();
const chatbotController = require('../controllers/chatbotController');

// ---------------------------------------------
// OPTIONAL: Lightweight anti-spam middleware
// Prevents bots or users from firing too many requests.
// ---------------------------------------------
const rateLimiter = (req, res, next) => {
    // Allow max 3 requests per second per IP (very safe)
    if (!global.__chatReqMap) global.__chatReqMap = {};

    const ip = req.ip;
    const now = Date.now();

    if (!global.__chatReqMap[ip]) {
        global.__chatReqMap[ip] = [now];
        return next();
    }

    // Remove timestamps older than 1 second
    global.__chatReqMap[ip] = global.__chatReqMap[ip].filter(t => now - t < 1000);

    // Limit: 3 requests per second per IP
    if (global.__chatReqMap[ip].length >= 3) {
        return res.status(429).json({ message: 'Too many requests. Please slow down.' });
    }

    global.__chatReqMap[ip].push(now);
    next();
};

/*
  Route: POST /chat
  -----------------
  - Entry point for user-to-AI text messages.
  - Calls chatbotController.chat (Level 4 auto language detection).
  - `rateLimiter` is used to prevent accidental or malicious spam.
*/
router.post('/chat', rateLimiter, chatbotController.chat);

module.exports = router;
