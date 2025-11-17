/*
  File: frontend/src/components/AIChatWidget.jsx
  Purpose: Floating chat widget component for AI interaction, primarily used on stock detail pages.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Implemented floating button and expandable chat window UI.
  - Manages chat history, input, and loading states.
  - Integrates with backend `/api/chatbot/chat` endpoint.
  - Provides context to the AI based on the `stockSymbol` prop.

  CHANGES (2025-11—): (LEVEL 4 UPGRADE — Auto Multi-Language Ready)
  - Trim & validate input before sending to backend.
  - Prevents excessive message length (anti-spam).
  - Improved error bubble rendering for failed API calls.
  - Added comments and structural improvements for future Level 5 (multi-model).
*/

import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

function AIChatWidget({ stockSymbol }) {
  // -------------------------------
  // Local UI State
  // -------------------------------
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);     // Chat bubbles
  const [input, setInput] = useState('');           // Input field
  const [loading, setLoading] = useState(false);    // AI "typing..."
  const messagesEndRef = useRef(null);

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Scroll when new messages appear
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [messages]);

  // ---------------------------------------------
  // Dynamic context for the AI
  // Backend will auto-detect language, so this is safe in English.
  // ---------------------------------------------
  const contextPrompt = stockSymbol
    ? `You are an AI assistant specialized in stock market analysis for ${stockSymbol}. Provide insights, news, and market information specifically about ${stockSymbol}.`
    : "You are an AI assistant specialized in general stock market analysis. Provide insights, news, and market information.";

  // ---------------------------------------------
  // Handle Sending Message
  // ---------------------------------------------
  const handleSendMessage = useCallback(
    async (e) => {
      e.preventDefault();
      let text = input.trim();

      // Validation
      if (text === '' || loading) return;
      if (text.length > 2000) {
        alert("Your message is too long (max 2000 characters).");
        return;
      }

      // Add user bubble
      const userMessage = { sender: 'user', text };
      setMessages((prev) => [...prev, userMessage]);

      // Reset input
      setInput('');
      setLoading(true);

      try {
        // Call backend → backend handles auto language detection
        const res = await api.post('/chatbot/chat', {
          message: text,
          context: contextPrompt
        });

        // Add AI bubble
        const aiResponse = { sender: 'ai', text: res.data.response };
        setMessages((prev) => [...prev, aiResponse]);

      } catch (error) {
        console.error('Error sending message to AI:', error);

        // Friendly error bubble
        setMessages((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: '⚠️ Unable to reach AI service. Please try again later.'
          }
        ]);

      } finally {
        setLoading(false);
      }
    },
    [input, loading, contextPrompt]
  );

  // ---------------------------------------------
  // CLOSED WIDGET RENDER
  // ---------------------------------------------
  if (!isOpen) {
    return (
      <button
        className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-300 ${
          isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
        } text-white`}
        onClick={() => setIsOpen(true)}
      >
        💬 AI Chat
      </button>
    );
  }

  // ---------------------------------------------
  // OPENED WIDGET RENDER
  // ---------------------------------------------
  return (
    <div
      className={`fixed bottom-4 right-4 z-50 w-80 h-96 flex flex-col rounded-lg shadow-xl border overflow-hidden ${
        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
      }`}
    >
      {/* Header */}
      <div
        className={`flex justify-between items-center p-3 border-b ${
          isDark ? 'bg-gray-800 border-gray-700' : 'bg-blue-500 text-white border-blue-600'
        }`}
      >
        <h3 className="font-bold">
          AI Advisor Chat {stockSymbol ? `(${stockSymbol})` : ''}
        </h3>
        <button onClick={() => setIsOpen(false)} className="text-white hover:opacity-80">
          ✕
        </button>
      </div>

      {/* Chat Window */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && !loading && (
          <div
            className={`text-center text-sm ${
              isDark ? 'text-gray-400' : 'text-gray-600'
            }`}
          >
            Start chatting with your AI Advisor!
          </div>
        )}

        {/* Chat Bubbles */}
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] p-2 rounded-lg shadow-sm text-sm whitespace-pre-line break-words ${
                msg.sender === 'user'
                  ? isDark
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-500 text-white'
                  : isDark
                  ? 'bg-gray-700 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div
              className={`max-w-[75%] p-2 rounded-lg shadow-sm text-sm ${
                isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
              }`}
            >
              Typing...
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSendMessage}
        className={`p-3 border-t ${
          isDark ? 'border-gray-700' : 'border-gray-300'
        } flex space-x-2`}
      >
        <input
          type="text"
          className={`flex-1 p-2 rounded-lg border focus:outline-none focus:ring-2 ${
            isDark
              ? 'bg-gray-800 border-gray-600 text-white focus:ring-blue-500'
              : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-500'
          }`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about stocks..."
          disabled={loading}
        />

        <button
          type="submit"
          className={`px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
            loading || input.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={loading || input.trim() === ''}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default AIChatWidget;
