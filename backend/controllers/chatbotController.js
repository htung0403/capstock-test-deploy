/*
  File: controllers/chatbotController.js
  Purpose: Handles API requests for the AI chatbot, orchestrating communication with Ollama AI service.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Exports `chat` function to receive user messages and context, then sends them to Ollama AI.
  
  CHANGES (2025-12-08):
  - Migrated from Gemini API to Ollama local AI (llama3.1:8b)

  CHANGES (2025-11-—):  (LEVEL 4 UPGRADE — Auto Multi-Language Ready)
  - Added stronger validation for message input.
  - Trimmed message to avoid whitespace-based spam.
  - Added optional context sanitization.
  - Added structured comments to clarify request workflow.
  - Prepared the controller for future Level-5 expansion (multi-model, RAG).
*/

const { askAI } = require('../services/aiService');
const aiOrchestratorService = require('../services/aiOrchestratorService');
const requestDeduplicationService = require('../services/requestDeduplicationService');

/*
  Controller: chat
  ----------------
  - Receives user message & optional context from frontend.
  - Validates message (must be non-empty, safe length).
  - Sends request to Ollama AI service (aiService.js).
  - Returns a clean JSON response for frontend.

  NOTE:
  - Uses Ollama local AI (llama3.1:8b) - no API key required.
  - System prompt handles language detection automatically.
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

        // 5. Call AI service (Ollama local)
        const messages = [
          {
            role: "system",
            content: "You are an AI assistant specializing in stock analysis, financial insights, and helping users understand investment trends. Speak in Vietnamese unless the user requests English."
          },
          {
            role: "user",
            content: context ? `${context}\n\n${message}` : message
          }
        ];
        const aiResponse = await askAI(messages);

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

/**
 * Enhanced chat endpoint with AI orchestration
 * Supports structured responses with ML models, RAG, and portfolio data
 * 
 * CHANGES (2025-12-06):
 * - Added chatEnhanced endpoint for hybrid AI architecture
 * - Integrates intent detection, ML models, RAG, and LLM
 * - Returns structured responses for rich UI rendering
 */
exports.chatEnhanced = async (req, res) => {
    try {
        let { message, context = {} } = req.body;
        const userId = req.user?.id;  // From JWT middleware

        // 1. Validate existence
        if (!message) {
            return res.status(400).json({ 
                success: false,
                error: { 
                    code: 'MESSAGE_REQUIRED', 
                    message: 'Message is required.' 
                } 
            });
        }

        // 2. Normalize message
        message = String(message).trim();
        if (message.length === 0) {
            return res.status(400).json({ 
                success: false,
                error: { 
                    code: 'MESSAGE_EMPTY', 
                    message: 'Message cannot be empty.' 
                } 
            });
        }

        // 3. Prevent extremely long messages
        if (message.length > 2000) {
            return res.status(413).json({ 
                success: false,
                error: { 
                    code: 'MESSAGE_TOO_LONG', 
                    message: 'Message is too long (2000+ chars).' 
                } 
            });
        }

        // 4. Check for duplicate request (within 5 seconds)
        const dedupCheck = requestDeduplicationService.checkDuplicate(message, JSON.stringify(context));
        if (dedupCheck && dedupCheck.isDuplicate) {
            console.log('[ChatbotController] Duplicate request detected, returning cached response');
            return res.json({ 
                success: true, 
                response: dedupCheck.cachedResponse,
                cached: true
            });
        }

        // 5. Add userId to context
        const enhancedContext = {
            ...context,
            userId: userId
        };

        // 6. Call orchestrator
        const response = await aiOrchestratorService.processMessage(message, enhancedContext);
        
        // 7. Store request for deduplication
        requestDeduplicationService.storeRequest(message, JSON.stringify(context), response);

        // 6. Return structured response
        res.json({ 
            success: true, 
            response: response 
        });

    } catch (error) {
        console.error('Error in chatbot enhanced controller:', error);
        
        // Fallback to simple chat
        try {
            const fallbackMessages = [
              {
                role: "system",
                content: "You are an AI assistant specializing in stock analysis, financial insights, and helping users understand investment trends. Speak in Vietnamese unless the user requests English."
              },
              {
                role: "user",
                content: message || req.body.message || ''
              }
            ];
            const fallbackResponse = await askAI(fallbackMessages);
            res.json({
                success: false,
                error: { 
                    code: 'ORCHESTRATOR_FAILED', 
                    message: error.message 
                },
                fallback: {
                    type: 'general',
                    text: fallbackResponse
                }
            });
        } catch (fallbackError) {
            res.status(500).json({
                success: false,
                error: { 
                    code: 'INTERNAL_ERROR', 
                    message: 'Failed to get AI response.' 
                }
            });
        }
    }
};
