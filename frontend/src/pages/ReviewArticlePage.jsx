/*
  File: frontend/src/pages/ReviewArticlePage.jsx
  Purpose: Page for Editors to review, approve, reject, and update articles.
  Date: 2025-10-20
*/
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Editor } from '@tinymce/tinymce-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'react-toastify';

function ReviewArticlePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Form states
  const [note, setNote] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState(''); // Comma separated tag names
  const [publishedAt, setPublishedAt] = useState('');
  const [isPremium, setIsPremium] = useState(false);
  const [symbol, setSymbol] = useState('');
  const [thumbnail, setThumbnail] = useState('');

  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]); // All available tags for selection

  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const fetchArticleAndCategories = useCallback(async () => {
    try {
      // Fetch categories
      const categoriesRes = await api.get('/categories'); 
      setCategories(categoriesRes.data);

      // Fetch all tags
      const tagsRes = await api.get('/tags'); 
      setAllTags(tagsRes.data);

      const response = await api.get(`/editor/article/${id}`);
      const data = response.data;
      setArticle(data);
      setCategory(data.category ? data.category._id : '');
      setTags(data.tags ? data.tags.map(tag => tag.tag_name).join(', ') : '');
      setPublishedAt(data.publishedAt ? new Date(data.publishedAt).toISOString().split('T')[0] : '');
      setIsPremium(data.isPremium);
      setNote(data.note || '');
      setSymbol(data.symbol || '');
      setThumbnail(data.thumbnail || '');
    } catch (err) {
      console.error("Error fetching article details for review:", err);
      setError(err?.response?.data?.message || err.message);
      toast.error(err?.response?.data?.message || `Failed to fetch article: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (user) {
        // Tạm thời bỏ qua kiểm tra vai trò để phát triển và kiểm thử
        // if (user.role !== 'EDITOR' && user.role !== 'ADMIN') {
        //     navigate('/dashboard'); // Redirect if not authorized
        //     toast.error("Access Denied: Only editors or administrators can review articles.");
        //     return;
        // }
        fetchArticleAndCategories();
    } else {
        setLoading(false);
        setError("Please log in as an editor to review articles.");
        toast.info("Please log in as an editor to review articles.");
    }
  }, [user, navigate, fetchArticleAndCategories]);

  const getTagObjectIds = (tagNamesString) => {
    const selectedTagNames = tagNamesString.split(',').map(tag => tag.trim()).filter(Boolean);
    return allTags.filter(tag => selectedTagNames.includes(tag.tag_name)).map(tag => tag._id);
  };

  const handleApprove = async () => {
    if (!user?.id) {
      toast.error('Editor ID is missing. Please log in as an editor.');
      return;
    }

    const tagObjectIds = getTagObjectIds(tags);

    try {
      await api.put(`/editor/approve/${id}`, {
        category,
        tags: tagObjectIds,
        publishedAt: publishedAt || new Date(), // Use current date if not provided
        isPremium,
        note,
        symbol: symbol.toUpperCase(),
        thumbnail,
      });
      toast.success('Article approved and published!');
      navigate('/editor/dashboard');
    } catch (err) {
      console.error('Error approving article:', err);
      toast.error(err?.response?.data?.message || `Error approving article: ${err.message}`);
    }
  };

  const handleReject = async () => {
    if (!note.trim()) {
      toast.warn('Please provide a reason for rejection in the Editor Note.');
      return;
    }
    try {
      await api.put(`/editor/reject/${id}`, {
        note,
      });
      toast.info('Article rejected!');
      navigate('/editor/dashboard');
    } catch (err) {
      console.error('Error rejecting article:', err);
      toast.error(err?.response?.data?.message || `Error rejecting article: ${err.message}`);
    }
  };

  const handleEditorUpdate = async () => {
    const tagObjectIds = getTagObjectIds(tags);

    try {
      await api.put(`/editor/article/${id}`, {
        category,
        tags: tagObjectIds,
        publishedAt: publishedAt || undefined, // Send undefined if empty to avoid invalid date
        isPremium,
        note,
        symbol: symbol.toUpperCase(),
        thumbnail,
      });
      toast.success('Article details updated by editor!');
      // No navigation, stay on the page to allow further review/approval
    } catch (err) {
      console.error('Error editor updating article details:', err);
      toast.error(err?.response?.data?.message || `Error updating article details: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="container mx-auto p-4 text-center text-gray-700 dark:text-gray-300">Loading article details...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!article) {
    return <div className="container mx-auto p-4 text-center text-gray-700 dark:text-gray-300">Article not found.</div>;
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      <div className="container mx-auto p-4">
        <h2 className={`text-3xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-800'}`}>Review Article: {article.title}</h2>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <p className="text-lg mb-2"><strong>Author:</strong> {article.author ? article.author.pen_name || article.author.username : 'N/A'}</p>
          <p className="text-lg mb-2"><strong>Status:</strong> 
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${article.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : article.status === 'published' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
              {article.status.charAt(0).toUpperCase() + article.status.slice(1)}
            </span>
          </p>
          <p className="text-lg mb-2"><strong>Created At:</strong> {new Date(article.createdAt).toLocaleDateString()}</p>
          {article.publishedAt && <p className="text-lg mb-2"><strong>Published At:</strong> {new Date(article.publishedAt).toLocaleDateString()}</p>}
          {article.publishBy && <p className="text-lg mb-2"><strong>Published By:</strong> {article.publishBy.username}</p>}
          {article.symbol && <p className="text-lg mb-2"><strong>Stock Symbol:</strong> {article.symbol}</p>}
          {article.thumbnail && <p className="text-lg mb-2"><strong>Thumbnail:</strong> <a href={article.thumbnail} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View Thumbnail</a></p>}
          {article.isPremium && <p className="text-lg mb-2 text-yellow-600 font-semibold">Premium Article</p>}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h3 className={`text-2xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Article Content</h3>
          <p className="text-lg mb-2"><strong>Summary:</strong> {article.summary}</p>
          <div className="mb-4">
            <Editor
              apiKey="l9fgmfwmww0cj0btvko4gk2p9155717yyhvc6675o9gkfzm6" 
              init={{
                height: 400,
                menubar: false,
                plugins: [
                  'advlist autolink lists link image charmap print preview anchor',
                  'searchreplace visualblocks code fullscreen',
                  'insertdatetime media table paste code help wordcount codesample'
                ],
                toolbar: 'undo redo | formatselect | bold italic backcolor | \
                          alignleft aligncenter alignright alignjustify | \
                          bullist numlist outdent indent | removeformat | help | codesample'
              }}
              value={article.content}
              disabled={true} // Editor can't change the content directly here
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h3 className={`text-2xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-800'}`}>Editor Actions</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Category:</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">Select a category</option>
                {categories.map((cat) => (
                  <option key={cat._id} value={cat._id}>
                    {cat.category_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tags (comma separated names):</label>
              <input 
                type="text" 
                value={tags} 
                onChange={(e) => setTags(e.target.value)} 
                placeholder="e.g., technology, finance, market news" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Stock Symbol (optional):</label>
              <input 
                type="text" 
                value={symbol} 
                onChange={(e) => setSymbol(e.target.value)} 
                placeholder="e.g., AAPL, GOOGL" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Publish Date:</label>
              <input 
                type="date" 
                value={publishedAt} 
                onChange={(e) => setPublishedAt(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="isPremium" 
                checked={isPremium} 
                onChange={(e) => setIsPremium(e.target.checked)} 
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <label htmlFor="isPremium" className="ml-2 block text-sm text-gray-900 dark:text-gray-200">Premium Article</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Thumbnail URL (optional):</label>
              <input 
                type="text" 
                value={thumbnail} 
                onChange={(e) => setThumbnail(e.target.value)} 
                placeholder="https://example.com/thumbnail.jpg" 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Editor Note:</label>
              <textarea 
                value={note} 
                onChange={(e) => setNote(e.target.value)} 
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                rows="3"
              ></textarea>
            </div>
            <button 
              onClick={handleEditorUpdate} 
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Update Article Details
            </button>
            <br />
            <div className="flex justify-between space-x-4">
              {article.status === 'pending' && (
                <button 
                  onClick={handleApprove} 
                  className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Approve Article
                </button>
              )}
              {(article.status === 'pending' || article.status === 'published') && (
                <button 
                  onClick={handleReject} 
                  className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Reject Article
                </button>
              )}
              {article.status === 'denied' && (
                <button 
                  onClick={handleApprove} 
                  className="flex-1 justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  Approve Article (previously denied)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReviewArticlePage;
