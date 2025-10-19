import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';

function formatCurrency(n) {
  if (n == null || Number.isNaN(n)) return '';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('vi-VN');
}

function getStatusColor(status) {
  switch (status) {
    case 'FILLED':
      return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
    case 'PENDING':
      return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20';
    case 'CANCELLED':
      return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
    default:
      return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/20';
  }
}

function getTypeColor(type) {
  switch (type) {
    case 'BUY':
      return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20';
    case 'SELL':
      return 'text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20';
    default:
      return 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-900/20';
  }
}

export default function Orders() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({ status: '', type: '' });

  const isDark = theme === 'dark';

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.status) params.set('status', filter.status);
      if (filter.type) params.set('type', filter.type);
      
      const response = await api.get(`/orders?${params.toString()}`);
      setOrders(response.data.orders || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy lệnh này?')) return;

    try {
      await api.patch(`/orders/${orderId}/cancel`);
      alert('✅ Hủy lệnh thành công');
      fetchOrders();
    } catch (err) {
      alert(`❌ Lỗi: ${err.response?.data?.message || err.message}`);
    }
  };

  return (
    <div className="container px-4 py-8 text-slate-900 dark:text-slate-100">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">📋 Lệnh giao dịch</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Quản lý và theo dõi các lệnh mua bán cổ phiếu của bạn
          </p>
        </div>

        {/* Filters */}
        <div className="card mb-8">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="form-label text-sm">Trạng thái</label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="form-input min-w-[120px]"
              >
                <option value="">Tất cả</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="FILLED">Đã khớp</option>
                <option value="CANCELLED">Đã hủy</option>
              </select>
            </div>
            <div>
              <label className="form-label text-sm">Loại lệnh</label>
              <select
                value={filter.type}
                onChange={(e) => setFilter({ ...filter, type: e.target.value })}
                className="form-input min-w-[120px]"
              >
                <option value="">Tất cả</option>
                <option value="BUY">Mua</option>
                <option value="SELL">Bán</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setFilter({ status: '', type: '' })}
                className="btn btn-outline"
              >
                🔄 Đặt lại
              </button>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="card">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-600 dark:text-red-400">
              ❌ {error}
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📋</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">Chưa có lệnh giao dịch nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 px-4 font-semibold">Mã CP</th>
                    <th className="text-left py-3 px-4 font-semibold">Loại</th>
                    <th className="text-right py-3 px-4 font-semibold">Số lượng</th>
                    <th className="text-right py-3 px-4 font-semibold">Giá</th>
                    <th className="text-right py-3 px-4 font-semibold">Tổng giá trị</th>
                    <th className="text-center py-3 px-4 font-semibold">Trạng thái</th>
                    <th className="text-center py-3 px-4 font-semibold">Thời gian</th>
                    <th className="text-center py-3 px-4 font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr 
                      key={order._id} 
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <td className="py-4 px-4">
                        <div className="font-semibold">{order.stockSymbol}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">
                          {order.stock?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(order.type)}`}>
                          {order.type === 'BUY' ? '📈 Mua' : '📉 Bán'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-medium">
                        {order.quantity.toLocaleString()}
                      </td>
                      <td className="py-4 px-4 text-right font-medium">
                        {formatCurrency(order.price)}
                      </td>
                      <td className="py-4 px-4 text-right font-bold">
                        {formatCurrency(order.quantity * order.price)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status === 'FILLED' ? '✅ Đã khớp' : 
                           order.status === 'PENDING' ? '⏳ Chờ xử lý' : 
                           '❌ Đã hủy'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {order.status === 'PENDING' && (
                          <button
                            onClick={() => cancelOrder(order._id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                          >
                            ❌ Hủy
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {orders.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {orders.length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Tổng lệnh</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {orders.filter(o => o.status === 'FILLED').length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Đã khớp</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {orders.filter(o => o.status === 'PENDING').length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Chờ xử lý</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                {orders.filter(o => o.status === 'CANCELLED').length}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Đã hủy</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}