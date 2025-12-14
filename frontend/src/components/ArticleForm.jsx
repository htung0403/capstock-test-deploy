/*
  File: frontend/src/components/ArticleForm.jsx
  Purpose: Form component for creating and editing articles, integrating TinyMCE for rich text editing.
  Date: 2025-10-20
*/
import React, { useState, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';
import api from '../services/api'; // Your existing API service
import { useTheme } from '../contexts/ThemeContext';
import MultiSelect from './MultiSelect';
import CategorySelect from './CategorySelect';
import { toast } from 'react-toastify';
// import { useAuth } from '../contexts/AuthContext'; // Removed as authorId will be passed as prop

function ArticleForm({ articleId, onSave, initialData, authorId }) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [summary, setSummary] = useState(initialData?.summary || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [category, setCategory] = useState(initialData?.category?._id || '');
  const [selectedTagIds, setSelectedTagIds] = useState(initialData?.tags?.map(tag => tag._id) || []); // Store tag IDs
  const [symbol, setSymbol] = useState(initialData?.symbol || '');
  const [isPremium, setIsPremium] = useState(initialData?.isPremium || false);
  const [thumbnail, setThumbnail] = useState(initialData?.thumbnail || '');
  const [articleStatus, setArticleStatus] = useState(initialData?.status || 'draft');
  const [submitForReview, setSubmitForReview] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [allTags, setAllTags] = useState([]); // All available tags for selection
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [thumbnailPreview, setThumbnailPreview] = useState(initialData?.thumbnail || '');
  
  // Use ThemeContext for dark mode detection
  const { theme } = useTheme();
  const darkMode = theme === 'dark';
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
          setSelectedTagIds(data.tags?.map(tag => tag._id) || []);
          setSymbol(data.symbol || '');
          setIsPremium(data.isPremium);
          setThumbnail(data.thumbnail || '');
          setThumbnailPreview(data.thumbnail || '');
          setArticleStatus(data.status || 'draft');
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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setThumbnail(response.data.url);
        setThumbnailPreview(response.data.url);
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      console.error('Error uploading image:', err);
      alert(`Error uploading image: ${err?.response?.data?.message || err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveThumbnail = () => {
    setThumbnail('');
    setThumbnailPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!authorId) {
      alert('Author ID is missing. Please log in.');
      return;
    }

    // Determine final status and submitForReview flag
    let finalStatus = articleStatus;
    let finalSubmitForReview = false;

    if (!articleId) {
      // New article: use selected status
      finalStatus = articleStatus; // 'draft' or 'pending'
      finalSubmitForReview = articleStatus === 'pending';
    } else {
      // Existing article
      if (articleStatus === 'published') {
        // Published article: can only submit for review again
        finalSubmitForReview = submitForReview;
        finalStatus = 'published'; // Keep published status
      } else if (articleStatus === 'draft' || articleStatus === 'denied') {
        // Draft or denied: can change to pending
        finalStatus = submitForReview ? 'pending' : 'draft';
        finalSubmitForReview = submitForReview;
      }
    }

    const articleData = {
      title,
      summary,
      content,
      category,
      tags: selectedTagIds, // Send ObjectIds directly
      authorId: authorId, // Use authorId from props
      symbol: symbol.toUpperCase(),
      isPremium,
      thumbnail,
      status: finalStatus, // Send status explicitly
      submitForReview: finalSubmitForReview,
    };

    const url = articleId ? `/writer/article/${articleId}` : '/writer'; // Removed /api
    const method = articleId ? 'PUT' : 'POST';

    try {
      const res = await api({ url, method, data: articleData });
      const message = articleStatus === 'published' && submitForReview 
        ? 'Article updated and submitted for review!' 
        : `Article ${articleId ? 'updated' : 'created'} successfully!`;
      alert(message);
      onSave(res.data);
    } catch (err) {
      console.error(`Error ${articleId ? 'updating' : 'creating'} article:`, err);
      alert(`Error ${articleId ? 'updating' : 'creating'} article: ${err?.response?.data?.message || err.message}`);
      setError(err?.response?.data?.message || err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="mt-4 text-gray-700 dark:text-gray-300 font-medium">Loading form...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 bg-white dark:bg-gray-800 rounded-lg">
        <div className="inline-block p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-sm">
          <p className="text-red-700 dark:text-red-400 font-semibold">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 p-6 rounded-lg shadow-lg transition-colors duration-200 ${
      darkMode 
        ? 'bg-gray-800' 
        : 'bg-white border border-gray-200'
    }`}>
      <div>
        <label className={`block text-sm font-semibold mb-2 ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>Title:</label>
        <input 
          type="text" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
          className={`mt-1 block w-full px-3 py-2.5 rounded-md border shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 ${
            darkMode
              ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-400 focus:border-transparent'
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-400'
          }`}
        />
      </div>
      <div>
        <label className={`block text-sm font-semibold mb-2 ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>
          Thumbnail Image (optional):
        </label>
        
        {thumbnailPreview ? (
          <div className="mt-2 space-y-2">
            <div className="relative inline-block group">
              <img 
                src={thumbnailPreview} 
                alt="Thumbnail preview" 
                className={`max-w-full h-48 object-cover rounded-md border-2 shadow-md transition-all duration-200 ${
                  darkMode ? 'border-gray-600' : 'border-gray-300'
                }`}
              />
              <button
                type="button"
                onClick={handleRemoveThumbnail}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white rounded-full p-1.5 text-xs shadow-lg transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-red-400"
                title="Remove image"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              <svg className="w-4 h-4 mr-1 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Image uploaded successfully
            </p>
          </div>
        ) : (
          <div className="mt-2">
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-200 ${
              darkMode
                ? 'border-gray-600 bg-gray-700/50 hover:bg-gray-700 hover:border-blue-500'
                : 'border-gray-300 bg-gray-50 hover:bg-blue-50 hover:border-blue-400'
            }`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <>
                    <svg className="w-8 h-8 mb-2 text-gray-500 dark:text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="mb-2 text-sm text-gray-600 dark:text-gray-300 font-medium">Uploading...</p>
                  </>
                ) : (
                  <>
                    <svg className="w-8 h-8 mb-2 text-blue-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                    </svg>
                    <p className="mb-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold text-blue-600 dark:text-gray-300">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, GIF up to 5MB</p>
                  </>
                )}
              </div>
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}
        
        {thumbnail && (
          <input 
            type="hidden" 
            value={thumbnail}
          />
        )}
      </div>
      <div>
        <label className={`block text-sm font-semibold mb-2 ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>Summary:</label>
        <textarea 
          value={summary} 
          onChange={(e) => setSummary(e.target.value)} 
          required 
          className={`mt-1 block w-full px-3 py-2.5 rounded-md border shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 resize-y ${
            darkMode
              ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-400 focus:border-transparent'
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-400'
          }`}
          rows="3"
        />
      </div>
      <div>
        <label className={`block text-sm font-semibold mb-2 ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>Content:</label>
        <div className={`border rounded-md overflow-hidden shadow-sm ${
          darkMode ? 'border-gray-600' : 'border-gray-300'
        }`}>
          <Editor
            key={darkMode ? 'dark' : 'light'}
            apiKey="l9fgmfwmww0cj0btvko4gk2p9155717yyhvc6675o9gkfzm6" 
            init={{
              height: 500,
              menubar: 'file edit view insert format tools table help',
              plugins: 'advlist autolink lists link image charmap print preview anchor searchreplace visualblocks code fullscreen insertdatetime media table paste help wordcount codesample',
              toolbar: 'undo redo | formatselect | bold italic backcolor | \
                        alignleft aligncenter alignright alignjustify | \
                        bullist numlist outdent indent | removeformat | help | codesample',
              skin: darkMode ? 'oxide-dark' : 'oxide',
              content_css: darkMode ? 'dark' : 'default',
              content_style: darkMode 
                ? 'body { background-color: #374151; color: #f3f4f6; }'
                : 'body { background-color: #ffffff; color: #111827; font-size: 14px; }',
              branding: false,
              promotion: false,
            }}
            value={content}
            onEditorChange={handleEditorChange}
          />
        </div>
      </div>
      <CategorySelect
        label="Category"
        options={categories}
        value={category}
        onChange={setCategory}
        onCreateNew={async (categoryName) => {
          try {
            const response = await api.post('/categories', { category_name: categoryName });
            const newCategory = response.data;
            setCategories([...categories, newCategory]);
            toast.success(`Category "${newCategory.category_name}" created successfully`);
            return newCategory;
          } catch (error) {
            console.error('Error creating category:', error);
            toast.error(error?.response?.data?.message || 'Failed to create category');
            throw error;
          }
        }}
        required
        placeholder="Search or create category..."
      />
      <MultiSelect
        label="Tags"
        options={allTags}
        selected={selectedTagIds}
        onChange={setSelectedTagIds}
        onCreateNew={async (tagName) => {
          try {
            const response = await api.post('/tags', { tag_name: tagName });
            const newTag = response.data;
            setAllTags([...allTags, newTag]);
            toast.success(`Tag "${newTag.tag_name}" created successfully`);
            return newTag;
          } catch (error) {
            console.error('Error creating tag:', error);
            // If tag already exists, return it
            if (error?.response?.status === 200) {
              const existingTag = error.response.data;
              setAllTags([...allTags, existingTag]);
              return existingTag;
            }
            toast.error(error?.response?.data?.message || 'Failed to create tag');
            throw error;
          }
        }}
        placeholder="Search or create tags..."
      />
      <div>
        <label className={`block text-sm font-semibold mb-2 ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>Stock Symbol (optional):</label>
        <input 
          type="text" 
          value={symbol} 
          onChange={(e) => setSymbol(e.target.value)} 
          placeholder="e.g., AAPL, GOOGL" 
          className={`mt-1 block w-full px-3 py-2.5 rounded-md border shadow-sm focus:outline-none focus:ring-2 transition-all duration-200 uppercase ${
            darkMode
              ? 'border-gray-600 bg-gray-700 text-gray-100 placeholder-gray-500 focus:ring-blue-400 focus:border-transparent'
              : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-400'
          }`}
        />
      </div>
      <div className={`flex items-center p-4 rounded-md border transition-colors duration-200 ${
        darkMode
          ? 'bg-gray-700/50 border-gray-600'
          : 'bg-gray-50 border-gray-200'
      }`}>
        <input 
          type="checkbox" 
          id="isPremium" 
          checked={isPremium} 
          onChange={(e) => setIsPremium(e.target.checked)} 
          className="h-4 w-4 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0 cursor-pointer transition-colors duration-200"
        />
        <label htmlFor="isPremium" className={`ml-3 block text-sm font-semibold cursor-pointer ${
          darkMode ? 'text-gray-200' : 'text-gray-900'
        }`}>Premium Article</label>
      </div>
      {articleId && articleStatus === 'published' && (
        <div className={`flex items-center p-4 rounded-md border transition-colors duration-200 ${
          darkMode
            ? 'bg-yellow-900/20 border-yellow-700'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <input 
            type="checkbox" 
            id="submitForReview" 
            checked={submitForReview} 
            onChange={(e) => setSubmitForReview(e.target.checked)} 
            className="h-4 w-4 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0 cursor-pointer transition-colors duration-200"
          />
          <label htmlFor="submitForReview" className={`ml-3 block text-sm font-semibold cursor-pointer ${
            darkMode ? 'text-yellow-200' : 'text-yellow-800'
          }`}>
            Save & Submit for Review (changes will go back to editor review)
          </label>
        </div>
      )}
      {/* Status Selection - Only show for new articles or draft/denied articles */}
      {(!articleId || articleStatus === 'draft' || articleStatus === 'denied') && (
        <div className={`p-4 rounded-md border transition-colors duration-200 ${
          darkMode
            ? 'bg-gray-700/50 border-gray-600'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <label className={`block text-sm font-semibold mb-3 ${
            darkMode ? 'text-gray-200' : 'text-gray-900'
          }`}>
            Article Status:
          </label>
          <div className="space-y-2">
            <label className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
              articleStatus === 'draft'
                ? darkMode
                  ? 'bg-blue-900/30 border-blue-600'
                  : 'bg-blue-50 border-blue-400'
                : darkMode
                ? 'border-gray-600 hover:bg-gray-700'
                : 'border-gray-300 hover:bg-gray-100'
            }`}>
              <input
                type="radio"
                name="articleStatus"
                value="draft"
                checked={articleStatus === 'draft'}
                onChange={(e) => {
                  setArticleStatus(e.target.value);
                  setSubmitForReview(false);
                }}
                className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              <div className="ml-3 flex-1">
                <div className={`font-medium ${
                  darkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  📝 Draft
                </div>
                <div className={`text-xs mt-0.5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Save as draft. You can edit and submit later.
                </div>
              </div>
            </label>

            <label className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${
              articleStatus === 'pending'
                ? darkMode
                  ? 'bg-yellow-900/30 border-yellow-600'
                  : 'bg-yellow-50 border-yellow-400'
                : darkMode
                ? 'border-gray-600 hover:bg-gray-700'
                : 'border-gray-300 hover:bg-gray-100'
            }`}>
              <input
                type="radio"
                name="articleStatus"
                value="pending"
                checked={articleStatus === 'pending'}
                onChange={(e) => {
                  setArticleStatus(e.target.value);
                  setSubmitForReview(true);
                }}
                className="h-4 w-4 text-yellow-600 dark:text-yellow-400 focus:ring-2 focus:ring-yellow-500 cursor-pointer"
              />
              <div className="ml-3 flex-1">
                <div className={`font-medium ${
                  darkMode ? 'text-gray-200' : 'text-gray-900'
                }`}>
                  ⏳ Submit for Review
                </div>
                <div className={`text-xs mt-0.5 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Submit to editor for review. Status will be "pending" until approved.
                </div>
              </div>
            </label>
          </div>
          <div className={`mt-3 p-2 rounded text-xs ${
            darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'
          }`}>
            <strong>Note:</strong> Only editors can publish articles. Your article will be reviewed before publication.
          </div>
        </div>
      )}

      {/* Show checkbox for existing published articles */}
      {articleId && articleStatus === 'published' && (
        <div className={`flex items-center p-4 rounded-md border transition-colors duration-200 ${
          darkMode
            ? 'bg-yellow-900/20 border-yellow-700'
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <input 
            type="checkbox" 
            id="submitForReview" 
            checked={submitForReview} 
            onChange={(e) => setSubmitForReview(e.target.checked)} 
            className="h-4 w-4 text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-0 cursor-pointer transition-colors duration-200"
          />
          <label htmlFor="submitForReview" className={`ml-3 block text-sm font-semibold cursor-pointer ${
            darkMode ? 'text-yellow-200' : 'text-yellow-800'
          }`}>
            Save & Submit for Review (changes will go back to editor review)
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <button 
          type="submit" 
          className="flex-1 flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-semibold text-white bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {articleId 
            ? articleStatus === 'pending' 
              ? 'Update & Keep Pending' 
              : 'Update Article'
            : articleStatus === 'pending'
              ? 'Create & Submit for Review'
              : 'Create as Draft'
          }
        </button>
      </div>
    </form>
  );
}

export default ArticleForm;
