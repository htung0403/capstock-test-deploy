import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Import the API service

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [portfolioData, setPortfolioData] = useState(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(true);
  const [portfolioError, setPortfolioError] = useState(null);

  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!user) {
        setLoadingPortfolio(false);
        return;
      }
      try {
        const response = await api.get('/portfolio');
        setPortfolioData(response.data);
      } catch (err) {
        console.error('Error fetching portfolio for profile:', err);
        setPortfolioError('Failed to load portfolio data.');
      } finally {
        setLoadingPortfolio(false);
      }
    };

    fetchPortfolio();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // TODO: Implement profile update API call
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setIsEditing(false);
  };

  // Calculate total holdings and total profit
  const totalHoldingsQuantity = portfolioData?.holdings.reduce((sum, holding) => sum + holding.quantity, 0) || 0;
  const totalCurrentValue = portfolioData?.holdings.reduce((sum, holding) => {
    // Ensure stock and currentPrice exist before calculating
    if (holding.stock && holding.stock.currentPrice) {
      return sum + (holding.quantity * holding.stock.currentPrice);
    }
    return sum;
  }, 0) || 0;

  const totalInvested = portfolioData?.holdings.reduce((sum, holding) => {
    return sum + (holding.quantity * holding.avgBuyPrice);
  }, 0) || 0;

  const totalProfit = totalCurrentValue - totalInvested;
  const formattedTotalProfit = totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const profitColorClass = totalProfit >= 0 ? 'text-green-600' : 'text-red-600';
  const profitSign = totalProfit >= 0 ? '+' : '';

  if (!user) {
    // Handle case where user is not logged in or loading
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <p className="text-gray-600">Please log in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Thông tin tài khoản</h1>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Chỉnh sửa
            </button>
          )}
        </div>

        {/* Avatar Section */}
        <div className="flex items-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mr-4">
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{user?.username}</h2>
            <p className="text-gray-600">{user?.email}</p>
            <p className="text-green-600 font-semibold">
              💰 Số dư: {user?.balance?.toLocaleString() || 0} VND
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Thông tin cơ bản</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên người dùng
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-md ${
                    isEditing
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-md ${
                    isEditing
                      ? 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      : 'border-gray-200 bg-gray-50'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Thống kê tài khoản</h3>
            {loadingPortfolio ? (
              <p className="text-gray-600">Loading portfolio statistics...</p>
            ) : portfolioError ? (
              <p className="text-red-500">{portfolioError}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {user?.balance?.toLocaleString() || 0}
                  </div>
                  <div className="text-sm text-gray-600">Số dư (VND)</div>
                </div>
                
                <div className={`p-4 rounded-lg ${totalProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <div className={`text-2xl font-bold ${profitColorClass}`}>
                    {profitSign}{formattedTotalProfit}
                  </div>
                  <div className="text-sm text-gray-600">Tổng lợi nhuận</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {totalHoldingsQuantity}
                  </div>
                  <div className="text-sm text-gray-600">Số cổ phiếu sở hữu</div>
                </div>
              </div>
            )}
          </div>

          {/* Password Change */}
          {isEditing && (
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-900">Đổi mật khẩu</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu hiện tại
                  </label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nhập mật khẩu mới"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Xác nhận mật khẩu mới
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Xác nhận mật khẩu mới"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Lưu thay đổi
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
              >
                Hủy
              </button>
            </div>
          )}
        </form>

        {/* Quick Actions */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">Thao tác nhanh</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => navigate('/payments')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              Nạp tiền
            </button>

            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Dashboard
            </button>

            <button
              onClick={() => {
                if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                  logout();
                  navigate('/login');
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;