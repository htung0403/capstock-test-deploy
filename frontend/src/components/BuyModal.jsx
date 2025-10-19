import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import api from '../services/api';

function formatCurrency(n) {
  if (n == null || Number.isNaN(n)) return '';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

const BuyModal = ({ 
  isOpen, 
  onClose, 
  stock, 
  onBuySuccess 
}) => {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();
  const { show } = useToast();
  const [buyQuantity, setBuyQuantity] = useState('');
  const [buyLoading, setBuyLoading] = useState(false);
  
  const isDark = theme === 'dark';

  const handleBuyStock = async () => {
    if (!buyQuantity || buyQuantity <= 0) {
      show('Vui lòng nhập số lượng hợp lệ', 'error');
      return;
    }

    if (!stock?.currentPrice) {
      show('Không thể lấy giá hiện tại của cổ phiếu', 'error');
      return;
    }

    const quantity = parseInt(buyQuantity);
    const price = stock.currentPrice;
    const totalCost = quantity * price;

    if (user.balance < totalCost) {
      show(`Số dư không đủ. Cần: ${formatCurrency(totalCost)}, Có: ${formatCurrency(user.balance)}`, 'error');
      return;
    }

    try {
      setBuyLoading(true);
      const response = await api.post('/orders', {
        stockSymbol: stock.symbol,
        type: 'BUY',
        quantity: quantity,
        price: price
      });

      if (response.data) {
        show(`✅ Mua thành công ${quantity} cổ phiếu ${stock.symbol} với giá ${formatCurrency(price)}`, 'success');
        setBuyQuantity('');
        onClose();
        
        // Refresh user data and trigger success callback
        await refreshUser();
        if (onBuySuccess) {
          onBuySuccess();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      show(`❌ Lỗi: ${errorMsg}`, 'error');
    } finally {
      setBuyLoading(false);
    }
  };

  // Reset quantity when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setBuyQuantity('');
    }
  }, [isOpen]);

  if (!isOpen || !stock) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full bg-white dark:bg-slate-900">
        <div className="card-header">
          <div className="card-title">💳 Mua cổ phiếu {stock.symbol}</div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Stock Info */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span>Giá hiện tại:</span>
                <span className="font-bold text-cyan-500">{formatCurrency(stock.currentPrice)}</span>
              </div>
              <div className="flex justify-between">
                <span>Số dư khả dụng:</span>
                <span className="font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(user?.balance || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Mã cổ phiếu:</span>
                <span className="font-medium">{stock.symbol}</span>
              </div>
              {stock.name && (
                <div className="flex justify-between">
                  <span>Tên công ty:</span>
                  <span className="font-medium text-xs">{stock.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          {user?.balance && stock?.currentPrice && (
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setBuyQuantity(Math.floor(user.balance * 0.25 / stock.currentPrice).toString())}
                className="btn btn-outline text-xs"
                disabled={Math.floor(user.balance * 0.25 / stock.currentPrice) <= 0}
              >
                25% số dư
              </button>
              <button
                onClick={() => setBuyQuantity(Math.floor(user.balance * 0.5 / stock.currentPrice).toString())}
                className="btn btn-outline text-xs"
                disabled={Math.floor(user.balance * 0.5 / stock.currentPrice) <= 0}
              >
                50% số dư
              </button>
              <button
                onClick={() => setBuyQuantity(Math.floor(user.balance / stock.currentPrice).toString())}
                className="btn btn-outline text-xs"
                disabled={Math.floor(user.balance / stock.currentPrice) <= 0}
              >
                Tối đa
              </button>
            </div>
          )}

          {/* Quantity Input */}
          <div>
            <label className="form-label">Số lượng cổ phiếu</label>
            <input
              type="number"
              value={buyQuantity}
              onChange={(e) => setBuyQuantity(e.target.value)}
              className="form-input"
              placeholder="Nhập số lượng muốn mua"
              min="1"
              step="1"
            />
            {user?.balance && stock?.currentPrice && (
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tối đa: {Math.floor(user.balance / stock.currentPrice)} cổ phiếu
              </div>
            )}
          </div>

          {/* Transaction Summary */}
          {buyQuantity && stock && (
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-3 text-blue-800 dark:text-blue-300">💼 Chi tiết giao dịch</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Số lượng:</span>
                  <span className="font-medium">{buyQuantity} cổ phiếu</span>
                </div>
                <div className="flex justify-between">
                  <span>Giá mỗi cổ phiếu:</span>
                  <span className="font-medium">{formatCurrency(stock.currentPrice)}</span>
                </div>
                
                <hr className="border-blue-200/50 dark:border-blue-700/30 my-2" />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Tổng cộng:</span>
                  <span className="text-blue-600 dark:text-blue-400">
                    {formatCurrency(buyQuantity * stock.currentPrice)}
                  </span>
                </div>
                
                {user?.balance && (
                  <div className="flex justify-between text-xs">
                    <span>Số dư còn lại:</span>
                    <span className="font-medium">
                      {formatCurrency(user.balance - (buyQuantity * stock.currentPrice))}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Important Notes */}
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">📋 Lưu ý quan trọng</h4>
            <div className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Giao dịch sẽ được thực hiện ngay lập tức với giá thị trường hiện tại</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Số tiền sẽ được trừ khỏi tài khoản của bạn</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Cổ phiếu sẽ được thêm vào danh mục đầu tư</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Giao dịch không thể hoàn tác sau khi xác nhận</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="btn btn-outline flex-1"
              disabled={buyLoading}
            >
              Hủy
            </button>
            <button
              onClick={handleBuyStock}
              className="btn btn-primary flex-1"
              disabled={buyLoading || !buyQuantity || buyQuantity <= 0 || !stock}
            >
              {buyLoading ? 'Đang xử lý...' : '💳 Xác nhận mua'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyModal;