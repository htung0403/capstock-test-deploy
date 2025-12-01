/*
  File: frontend/src/pages/NewArticlePage.jsx
  Purpose: Page for Writers to create new articles using the ArticleForm component.
  Date: 2025-10-20
*/
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ArticleForm from '../components/ArticleForm';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function NewArticlePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSave = () => {
    navigate('/writer/dashboard'); // Navigate to writer dashboard after saving
  };

  // Tạm thời bỏ qua kiểm tra vai trò để phát triển và kiểm thử
  // if (!user || user.role !== 'WRITER' && user.role !== 'ADMIN') {
  //   return <div className="container mx-auto p-4 text-center text-red-500">Access Denied: Only writers or administrators can create articles.</div>;
  // }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark 
        ? 'bg-gray-900 text-white' 
        : 'bg-gradient-to-br from-gray-50 via-white to-gray-50 text-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-8 max-w-9xl">
        <div className="mb-8">
          <h2 className={`text-4xl font-bold mb-2 transition-colors duration-200 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Create New Article
          </h2>
          <p className={`text-sm transition-colors duration-200 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Fill in the form below to create a new article
          </p>
        </div>
        <ArticleForm authorId={user?.id} onSave={handleSave} />
      </div>
    </div>
  );
}

export default NewArticlePage;
