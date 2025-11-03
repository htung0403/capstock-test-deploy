/*
  File: frontend/src/pages/AIChatPage.jsx
  Purpose: Dedicated chat page for interacting with the AI Advisor.
  
  CHANGES (2025-10-20):
  - Initial creation of the file.
  - Implemented basic chat UI with message display, input field, and send button.
  - Integrated with backend `/api/chatbot/chat` endpoint to send messages and receive AI responses.
  - Enhanced UI with modern, futuristic design elements (gradients, shadows, smooth transitions).
*/
import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

function AIChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (input.trim() === '' || loading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chatbot/chat', { message: input });
      const aiResponse = { sender: 'ai', text: res.data.response };
      setMessages((prevMessages) => [...prevMessages, aiResponse]);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      setMessages((prevMessages) => [...prevMessages, { sender: 'ai', text: 'Sorry, I am having trouble connecting to the AI. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-screen overflow-hidden ${isDark ? 'bg-gradient-to-br from-gray-900 to-black text-gray-100' : 'bg-gradient-to-br from-blue-100 to-white text-gray-900'}`}>
      <div className="flex-1 flex flex-col p-6 space-y-4 overflow-y-auto custom-scrollbar">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-2xl px-5 py-3 rounded-2xl shadow-lg relative ${
              msg.sender === 'user' 
                ? (isDark ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' : 'bg-blue-500 text-white')
                : (isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800')
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className={`max-w-xs px-5 py-3 rounded-2xl shadow-lg relative animate-pulse ${
              isDark ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
            }`}>
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className={`flex-shrink-0 p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'} flex space-x-4`}>
        <input
          type="text"
          className={`flex-1 p-4 rounded-full border-2 focus:outline-none focus:ring-4 transition-all duration-200 text-lg ${
            isDark 
              ? 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/30' 
              : 'bg-white border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500/30'
          }`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI Advisor..."
          disabled={loading}
        />
        <button
          type="submit"
          className={`px-6 py-3 rounded-full shadow-lg font-semibold text-lg transition-all duration-200 ${
            isDark 
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white focus:ring-blue-500/50' 
              : 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-500/50'
          } focus:outline-none focus:ring-4`}
          disabled={loading || input.trim() === ''}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default AIChatPage;
