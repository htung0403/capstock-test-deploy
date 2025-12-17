import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Send cookies with requests
});

// Request interceptor - cookies are sent automatically with withCredentials: true
// Keep Authorization header for backward compatibility if needed
api.interceptors.request.use(
  (config) => {
    // Cookies are automatically sent with withCredentials: true
    // We can still check for token in localStorage for backward compatibility
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Check if this is a permission error (403 would be better, but some APIs return 401)
      // Don't logout if the error message suggests it's a permission issue rather than auth issue
      const errorMessage = error.response?.data?.message || '';
      const isPermissionError = errorMessage.toLowerCase().includes('insufficient') || 
                                errorMessage.toLowerCase().includes('permission') ||
                                errorMessage.toLowerCase().includes('forbidden') ||
                                errorMessage.toLowerCase().includes('unauthorized') ||
                                error.config?.url?.includes('/all-articles'); // Specific endpoint that might return 401 for non-admins
      
      // Check if this is a login/register request - don't redirect, let the component handle the error
      const isAuthRequest = error.config?.url?.includes('/users/login') || 
                           error.config?.url?.includes('/users/register');
      
      // Check if we're already on login/register page
      const isOnAuthPage = window.location.pathname === '/login' || 
                          window.location.pathname === '/register';
      
      // Try to refresh token if access token expired
      if (error.response?.status === 401 && !isAuthRequest && !isOnAuthPage) {
        // Check if it's a token expiration error
        if (error.response?.data?.error === 'TokenExpiredError') {
          // Try to refresh the token
          return api.post('/users/refresh-token')
            .then(() => {
              // Retry the original request after refresh
              return api.request(error.config);
            })
            .catch((refreshError) => {
              // Refresh failed, logout user
              if (!isPermissionError) {
                localStorage.removeItem('user');
                setTimeout(() => {
                  window.location.href = '/login';
                }, 100);
              }
              return Promise.reject(refreshError);
            });
        } else if (!isPermissionError) {
          // Not a token expiration, just logout
          localStorage.removeItem('user');
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
