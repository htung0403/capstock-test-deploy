/*
  File: controllers/chatbotController.js
  Purpose: Handles API requests for the AI chatbot, orchestrating communication with `chatbotService`.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Exports `chat` function to receive user messages and context, then sends them to `chatbotService`.

  CHANGES (2025-11-—):  (LEVEL 4 UPGRADE — Auto Multi-Language Ready)
  - Added stronger validation for message input.
  - Trimmed message to avoid whitespace-based spam.
  - Added optional context sanitization.
  - Added structured comments to clarify request workflow.
  - Prepared the controller for future Level-5 expansion (multi-model, RAG).
*/

const chatbotService = require('../services/chatbotService');

/*
  Controller: chat
  ----------------
  - Receives user message & optional context from frontend.
  - Validates message (must be non-empty, safe length).
  - Sends request to chatbotService (where the AI logic & language detection happens).
  - Returns a clean JSON response for frontend.

  NOTE:
  - This controller does NOT handle multi-language logic directly.
  - Language detection & prompt building are done inside chatbotService.js (Level 4).
*/
exports.chat = async (req, res) => {
    try {
        let { message, context } = req.body;

        // 1. Validate existence
        if (!message) {
            return res.status(400).json({ message: 'Message is required.' });
        }

        // 2. Normalize message
        message = String(message).trim();
        if (message.length === 0) {
            return res.status(400).json({ message: 'Message cannot be empty.' });
        }

        // 3. Prevent extremely long messages (security + cost control)
        if (message.length > 2000) {
            return res.status(413).json({ message: 'Message is too long (2000+ chars).' });
        }

        // 4. Normalize context (optional)
        if (context && typeof context === "string") {
            context = context.trim();
        }

        // 5. Call AI service (Gemini with multi-language)
        const aiResponse = await chatbotService.sendMessage(message, context);

        // 6. Return JSON as frontend expects
        res.json({ response: aiResponse });

    } catch (error) {
        console.error('Error in chatbot controller:', error);
        res.status(500).json({
            message: 'Failed to get AI response.',
            error: error.message
        });
    }
};
