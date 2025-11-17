/*
  File: frontend/src/pages/EditArticlePage.jsx
  Purpose: Page for Writers to edit existing articles using the ArticleForm component.
  Date: 2025-10-20
*/
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ArticleForm from '../components/ArticleForm';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

function EditArticlePage() {
  const { id } = useParams(); // Get article ID from URL
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const handleSave = () => {
    navigate('/writer/dashboard'); // Navigate to writer dashboard after saving
  };

  // Tạm thời bỏ qua kiểm tra vai trò để phát triển và kiểm thử
  // if (!user || (user.role !== 'WRITER' && user.role !== 'ADMIN')) {
  //   return <div className="container mx-auto p-4 text-center text-red-500">Access Denied: Only writers or administrators can edit articles.</div>;
  // }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto p-4">
        <h2 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Edit Article</h2>
        <ArticleForm articleId={id} authorId={user.id} onSave={handleSave} />
      </div>
    </div>
  );
}

export default EditArticlePage;
