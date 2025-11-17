/*
  File: frontend/src/components/ArticleForm.jsx
  Purpose: Form component for creating and editing articles, integrating TinyMCE for rich text editing.
  Date: 2025-10-20
*/
import React, { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import api from '../services/api'; // Your existing API service
// import { useAuth } from '../contexts/AuthContext'; // Removed as authorId will be passed as prop

function ArticleForm({ articleId, onSave, initialData, authorId }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [category, setCategory] = useState(initialData?.category?._id || '');
  const [tags, setTags] = useState(initialData?.tags?.map(tag => tag.tag_name).join(', ') || ''); // Display tag names
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [isPremium, setIsPremium] = useState(initialData?.isPremium || false);
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
  
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]); // All available tags for selection
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // const { user } = useAuth(); // Removed as authorId will be passed as prop

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const categoriesRes = await api.get('/categories'); // Removed /api
        setCategories(categoriesRes.data);

        // Fetch all tags
        const tagsRes = await api.get('/tags'); // Removed /api
        setAllTags(tagsRes.data);

        if (articleId) {
          const response = await api.get(`/writer/article/${articleId}`); // Removed /api
          const data = response.data;
          setTitle(data.title);
          setSummary(data.summary);
          setContent(data.content);
          setCategory(data.category?._id || '');
          setTags(data.tags?.map(tag => tag.tag_name).join(', ') || '');
          setSymbol(data.symbol || '');
          setIsPremium(data.isPremium);
          setThumbnail(data.thumbnail || '');
        }
      } catch (err) {
        console.error("Error fetching form data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [articleId]);

  const handleEditorChange = (content, editor) => {
    setContent(content);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authorId) {
      alert('Author ID is missing. Please log in.');
      return;
    }

    // Convert tag names to ObjectIds
    const selectedTagNames = tags.split(',').map(tag => tag.trim()).filter(Boolean);
    const tagObjectIds = allTags.filter(tag => selectedTagNames.includes(tag.tag_name)).map(tag => tag._id);

    const articleData = {
      title,
      summary,
      content,
      category,
      tags: tagObjectIds, // Send ObjectIds
      authorId: authorId, // Use authorId from props
      symbol: symbol.toUpperCase(),
      isPremium,
      thumbnail,
    };

    const url = articleId ? `/writer/article/${articleId}` : '/writer'; // Removed /api
    const method = articleId ? 'PUT' : 'POST';

    try {
      const res = await api({ url, method, data: articleData });
      alert(`Article ${articleId ? 'updated' : 'created'} successfully!`);
      onSave(res.data);
    } catch (err) {
      console.error(`Error ${articleId ? 'updating' : 'creating'} article:`, err);
      alert(`Error ${articleId ? 'updating' : 'creating'} article: ${err?.response?.data?.message || err.message}`);
      setError(err?.response?.data?.message || err.message);
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading form...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center py-4">Error: {error}</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Title:</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Summary:</label>
        <textarea 
          value={summary} 
          onChange={(e) => setSummary(e.target.value)} 
          required 
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          rows="3"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Content:</label>
        <Editor
          apiKey="l9fgmfwmww0cj0btvko4gk2p9155717yyhvc6675o9gkfzm6" 
          init={{
            height: 500,
            menubar: 'file edit view insert format tools table help',
            plugins: [
              'advlist autolink lists link image charmap print preview anchor',
              'searchreplace visualblocks code fullscreen',
              'insertdatetime media table paste code help wordcount codesample'
            ],
            toolbar: 'undo redo | formatselect | bold italic backcolor | \
                      alignleft aligncenter alignright alignjustify | \
                      bullist numlist outdent indent | removeformat | help | codesample'
          }}
          value={content}
          onEditorChange={handleEditorChange}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Category:</label>
        <select 
          value={category} 
          onChange={(e) => setCategory(e.target.value)} 
          required 
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
      <button 
        type="submit" 
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        {articleId ? 'Update Article' : 'Create Article'}
      </button>
    </form>
  );
}

export default ArticleForm;
