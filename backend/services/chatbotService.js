/*
  File: services/chatbotService.js
  Purpose: Handles communication with the Google Gemini API for AI chatbot functionality.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Configures GoogleGenerativeAI with `GEMINI_API_KEY`.
  - Exports `sendMessage` function to send user messages and context to Gemini API and return AI response.
*/
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const API_KEY = process.env.GEMINI_API_KEY;
if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro"});

exports.sendMessage = async (message, context = '') => {
    try {
        const fullPrompt = context ? `${context}\nUser: ${message}` : `User: ${message}`;
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        return text;
    } catch (error) {
        console.error('Error communicating with Gemini API:', error);
        throw new Error('Failed to get response from AI.');
    }
};
