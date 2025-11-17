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
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/users/login', { email, password });
      const { token, user: userData } = response.data;
      
      // Ensure userData has an 'id' property, mapping from '_id' if necessary
      const processedUserData = { ...userData, id: userData._id || userData.id };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(processedUserData));
      setUser(processedUserData);
      show('Đăng nhập thành công', 'success');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      show(message, 'error');
      return { success: false, message };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/users/register', { username, email, password });
      const { token, user: userData } = response.data;
      
      // Ensure userData has an 'id' property, mapping from '_id' if necessary
      const processedUserData = { ...userData, id: userData._id || userData.id };

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(processedUserData));
      setUser(processedUserData);
      show('Tạo tài khoản thành công', 'success');
      
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      show(message, 'error');
      return { success: false, message };
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    show('Đã đăng xuất', 'info');
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
