/*
  File: controllers/chatbotController.js
  Purpose: Handles API requests for the AI chatbot, orchestrating communication with `chatbotService`.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Exports `chat` function to receive user messages and context, then sends them to `chatbotService`.
*/
const chatbotService = require('../services/chatbotService');

exports.chat = async (req, res) => {
    try {
        const { message, context } = req.body;
        if (!message) {
            return res.status(400).json({ message: 'Message is required.' });
        }
        const aiResponse = await chatbotService.sendMessage(message, context);
        res.json({ response: aiResponse });
    } catch (error) {
        console.error('Error in chatbot controller:', error);
        res.status(500).json({ message: 'Failed to get AI response.', error: error.message });
    }
};
