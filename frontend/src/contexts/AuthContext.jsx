import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../components/Toast';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { show } = useToast();

  useEffect(() => {
    // Check if user data exists in localStorage
    // Token is now in httpOnly cookie, so we don't check for it
    const userData = localStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Verify token is still valid by calling profile endpoint
        // This will also refresh token if needed
        api.get('/users/profile')
          .then(response => {
            const updatedUser = { ...response.data, id: response.data._id || response.data.id };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
          })
          .catch(() => {
            // Token invalid, clear user data
            localStorage.removeItem('user');
            setUser(null);
          });
      } catch (error) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/users/login', { email, password });
      const { user: userData } = response.data;
      
      // Tokens are now in httpOnly cookies, not in response
      // Ensure userData has an 'id' property, mapping from '_id' if necessary
      const processedUserData = { ...userData, id: userData._id || userData.id };

      // Store user data in localStorage (but not token - it's in httpOnly cookie)
      localStorage.setItem('user', JSON.stringify(processedUserData));
      setUser(processedUserData);
      show('Đăng nhập thành công', 'success');
      
      return { success: true };
    } catch (error) {
      // Extract detailed error message
      let message = 'Đăng nhập thất bại. Vui lòng thử lại.';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        // Use message from backend if available
        if (data?.message) {
          message = data.message;
        } else {
          // Provide specific messages based on status code
          switch (status) {
            case 400:
              message = 'Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại email và mật khẩu.';
              break;
            case 401:
              message = 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
              break;
            case 403:
              message = 'Tài khoản bị cấm. Vui lòng liên hệ quản trị viên.';
              break;
            case 429:
              message = 'Quá nhiều lần thử đăng nhập. Vui lòng thử lại sau.';
              break;
            case 500:
              message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
              break;
            default:
              message = `Lỗi ${status}: ${data?.error || 'Đã xảy ra lỗi không xác định'}`;
          }
        }
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED') {
          message = 'Yêu cầu hết thời gian chờ. Vui lòng kiểm tra kết nối mạng và thử lại.';
        } else if (error.message?.includes('Network Error')) {
          message = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
        } else {
          message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
        }
      } else {
        // Something else happened
        message = error.message || 'Đã xảy ra lỗi không xác định.';
      }
      
      show(message, 'error');
      return { success: false, message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/users/register', { username, email, password });
      const { user: userData } = response.data;
      
      // Tokens are now in httpOnly cookies, not in response
      // Ensure userData has an 'id' property, mapping from '_id' if necessary
      const processedUserData = { ...userData, id: userData._id || userData.id };

      // Store user data in localStorage (but not token - it's in httpOnly cookie)
      localStorage.setItem('user', JSON.stringify(processedUserData));
      setUser(processedUserData);
      show('Tạo tài khoản thành công', 'success');
      
      return { success: true };
    } catch (error) {
      // Extract detailed error message
      let message = 'Đăng ký thất bại. Vui lòng thử lại.';
      
      if (error.response) {
        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data;
        
        // Use message from backend if available
        if (data?.message) {
          message = data.message;
        } else {
          // Provide specific messages based on status code
          switch (status) {
            case 400:
              message = 'Thông tin không hợp lệ. Vui lòng kiểm tra lại.';
              break;
            case 401:
              message = 'Không có quyền truy cập.';
              break;
            case 403:
              message = 'Tài khoản bị cấm. Vui lòng liên hệ quản trị viên.';
              break;
            case 409:
              message = 'Tên người dùng hoặc email đã tồn tại.';
              break;
            case 500:
              message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
              break;
            default:
              message = `Lỗi ${status}: ${data?.error || 'Đã xảy ra lỗi không xác định'}`;
          }
        }
      } else if (error.request) {
        // Request was made but no response received
        if (error.code === 'ECONNABORTED') {
          message = 'Yêu cầu hết thời gian chờ. Vui lòng kiểm tra kết nối mạng và thử lại.';
        } else if (error.message?.includes('Network Error')) {
          message = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet và thử lại.';
        } else {
          message = 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.';
        }
      } else {
        // Something else happened
        message = error.message || 'Đã xảy ra lỗi không xác định.';
      }
      
      show(message, 'error');
      return { success: false, message };
    }
  };

  const logout = useCallback(async () => {
    try {
      // Call logout endpoint to clear cookies and refresh token in database
      await api.post('/users/logout');
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with logout even if API call fails
    } finally {
      // Clear local storage
      localStorage.removeItem('user');
      setUser(null);
      show('Đã đăng xuất', 'info');
    }
  }, [show]);

  // Function để refresh user data từ server
  const refreshUser = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      console.log("🔍 RefreshUser called, token exists:", !!token);

      if (!token) {
        console.log("❌ No token found");
        return;
      }

      console.log("📡 Calling API /users/profile...");
      const response = await api.get('/users/profile');
      const userData = response.data;

      console.log("✅ API Response:", userData);
      console.log("💰 User balance:", userData.balance);

      // Ensure userData has an 'id' property, mapping from '_id' if necessary
      const processedUserData = { ...userData, id: userData._id || userData.id };

      localStorage.setItem('user', JSON.stringify(processedUserData));
      setUser(processedUserData);

      return processedUserData;
    } catch (error) {
      console.error('❌ Error refreshing user data:', error);
      console.error('❌ Error response:', error.response?.data);

      // Nếu token hết hạn, logout user
      if (error.response?.status === 401) {
        console.log("🚪 Token expired, logging out...");
        logout();
      }
      throw error;
    }
  }, [logout]);

  const value = {
    user,
    login,
    register,
    logout,
    refreshUser,
    loading,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
