/*
  File: components/TextMessage.jsx
  Purpose: Simple text message component (fallback for general messages)
*/

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

function TextMessage({ text }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  return (
    <div
      className={`max-w-[75%] p-2 rounded-lg shadow-sm text-sm whitespace-pre-line break-words ${
        isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
      }`}
    >
      {text}
    </div>
  );
}

export default TextMessage;

