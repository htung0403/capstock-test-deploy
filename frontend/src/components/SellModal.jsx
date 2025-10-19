import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from './Toast';
import api from '../services/api';

function formatCurrency(n) {
  if (n == null || Number.isNaN(n)) return '';
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

const SellModal = ({ 
  isOpen, 
  onClose, 
  stock, 
  userHolding, 
  onSellSuccess,
  marketData = null // Additional market data from StockDetail (change, changePct)
}) => {
  const { refreshUser } = useAuth();
  const { theme } = useTheme();
  const { show } = useToast();
  const [sellQuantity, setSellQuantity] = useState('');
  const [sellLoading, setSellLoading] = useState(false);
  
  const isDark = theme === 'dark';

  const handleSellStock = async () => {
    if (!sellQuantity || sellQuantity <= 0) {
      show('Vui lòng nhập số lượng hợp lệ', 'error');
      return;
    }

    if (!stock?.currentPrice) {
      show('Không thể lấy giá hiện tại của cổ phiếu', 'error');
      return;
    }

    if (!userHolding) {
      show('Bạn không có cổ phiếu này để bán', 'error');
      return;
    }

    const quantity = parseInt(sellQuantity);
    const price = stock.currentPrice;

    if (quantity > userHolding.quantity) {
      show(`Bạn chỉ có ${userHolding.quantity} cổ phiếu để bán`, 'error');
      return;
    }

    try {
      setSellLoading(true);
      const response = await api.post('/orders', {
        stockSymbol: stock.symbol,
        type: 'SELL',
        quantity: quantity,
        price: price
      });

      if (response.data) {
        const totalValue = quantity * price;
        const costBasis = quantity * userHolding.avgBuyPrice;
        const profit = totalValue - costBasis;
        const profitText = profit >= 0 
          ? `Lãi: ${formatCurrency(profit)}`
          : `Lỗ: ${formatCurrency(Math.abs(profit))}`;
        
        show(`✅ Bán thành công ${quantity} cổ phiếu ${stock.symbol} với giá ${formatCurrency(price)}. ${profitText}`, 'success');
        setSellQuantity('');
        onClose();
        
        // Refresh user data and trigger success callback
        await refreshUser();
        if (onSellSuccess) {
          onSellSuccess();
        }
      }
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message;
      show(`❌ Lỗi: ${errorMsg}`, 'error');
    } finally {
      setSellLoading(false);
    }
  };

  // Reset quantity when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSellQuantity('');
    }
  }, [isOpen]);

  if (!isOpen || !userHolding || !stock) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900">
        <div className="card-header">
          <div className="card-title">📉 Bán cổ phiếu {stock.symbol}</div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Current Holdings & Market Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-3 text-slate-700 dark:text-slate-300">📊 Thông tin nắm giữ</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Số lượng đang có:</span>
                  <span className="font-bold text-green-600 dark:text-green-400">
                    {userHolding.quantity} cổ phiếu
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Giá mua trung bình:</span>
                  <span className="font-medium">{formatCurrency(userHolding.avgBuyPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tổng vốn đầu tư:</span>
                  <span className="font-medium">{formatCurrency(userHolding.quantity * userHolding.avgBuyPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giá trị hiện tại:</span>
                  <span className="font-bold text-cyan-500">{formatCurrency(userHolding.quantity * stock.currentPrice)}</span>
                </div>
                {(() => {
                  const totalProfit = (userHolding.quantity * stock.currentPrice) - (userHolding.quantity * userHolding.avgBuyPrice);
                  const totalProfitPct = ((stock.currentPrice - userHolding.avgBuyPrice) / userHolding.avgBuyPrice) * 100;
                  return (
                    <div className={`flex justify-between font-medium ${
                      totalProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      <span>Tổng P&L:</span>
                      <span>
                        {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit)} 
                        ({totalProfit >= 0 ? '+' : ''}{totalProfitPct.toFixed(2)}%)
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-3 text-slate-700 dark:text-slate-300">📈 Thị trường</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Giá hiện tại:</span>
                  <span className="font-bold text-cyan-500">{formatCurrency(stock.currentPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mã cổ phiếu:</span>
                  <span className="font-medium">{stock.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tên công ty:</span>
                  <span className="font-medium text-xs">{stock.name || 'N/A'}</span>
                </div>
                {marketData && (
                  <>
                    <div className="flex justify-between">
                      <span>Thay đổi hôm nay:</span>
                      <span className={`font-medium ${marketData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {marketData.change >= 0 ? '+' : ''}{marketData.change.toFixed(2)} ({marketData.changePct.toFixed(2)}%)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Xu hướng giá:</span>
                      <span className={`font-medium ${marketData.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {marketData.change >= 0 ? '📈 Tăng' : '📉 Giảm'}
                      </span>
                    </div>
                  </>
                )}
                {!marketData && (
                  <div className="flex justify-between">
                    <span>Trạng thái:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      📈 Đang giao dịch
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setSellQuantity(Math.floor(userHolding.quantity * 0.25).toString())}
              className="btn btn-outline text-xs"
            >
              25%
            </button>
            <button
              onClick={() => setSellQuantity(Math.floor(userHolding.quantity * 0.5).toString())}
              className="btn btn-outline text-xs"
            >
              50%
            </button>
            <button
              onClick={() => setSellQuantity(userHolding.quantity.toString())}
              className="btn btn-outline text-xs"
            >
              Tất cả
            </button>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="form-label">Số lượng cổ phiếu muốn bán</label>
            <input
              type="number"
              value={sellQuantity}
              onChange={(e) => setSellQuantity(e.target.value)}
              className="form-input"
              placeholder="Nhập số lượng muốn bán"
              min="1"
              max={userHolding.quantity}
              step="1"
            />
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Tối đa: {userHolding.quantity} cổ phiếu
            </div>
          </div>

          {/* Transaction Summary */}
          {sellQuantity && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 p-4 rounded-lg border border-red-200/50 dark:border-red-800/30">
              <h4 className="font-semibold text-sm mb-3 text-red-800 dark:text-red-300">💼 Chi tiết giao dịch</h4>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span>Số lượng bán:</span>
                  <span className="font-medium">{sellQuantity} cổ phiếu</span>
                </div>
                <div className="flex justify-between">
                  <span>Giá bán/cổ phiếu:</span>
                  <span className="font-medium">{formatCurrency(stock.currentPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Giá mua/cổ phiếu:</span>
                  <span className="font-medium">{formatCurrency(userHolding.avgBuyPrice)}</span>
                </div>
                
                <hr className="border-red-200/50 dark:border-red-700/30 my-2" />
                
                <div className="flex justify-between font-bold text-base">
                  <span>Tổng thu về:</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatCurrency(sellQuantity * stock.currentPrice)}
                  </span>
                </div>
                
                {(() => {
                  const qty = parseInt(sellQuantity);
                  const totalValue = qty * stock.currentPrice;
                  const costBasis = qty * userHolding.avgBuyPrice;
                  const profit = totalValue - costBasis;
                  const profitPct = (profit / costBasis) * 100;
                  
                  return (
                    <>
                      <div className="flex justify-between">
                        <span>Vốn gốc:</span>
                        <span className="font-medium">{formatCurrency(costBasis)}</span>
                      </div>
                      <div className={`flex justify-between font-bold ${
                        profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        <span>{profit >= 0 ? '💰 Lãi ròng:' : '📉 Lỗ:'}</span>
                        <span>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)} 
                          ({profit >= 0 ? '+' : ''}{profitPct.toFixed(2)}%)
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              {/* Remaining Holdings Info */}
              {parseInt(sellQuantity) < userHolding.quantity && (
                <div className="mt-4 pt-3 border-t border-red-200/50 dark:border-red-700/30">
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span>Còn lại sau bán:</span>
                      <span className="font-medium">
                        {userHolding.quantity - parseInt(sellQuantity)} cổ phiếu 
                        ({formatCurrency((userHolding.quantity - parseInt(sellQuantity)) * stock.currentPrice)})
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Risk Analysis */}
          {sellQuantity && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200/50 dark:border-yellow-800/30">
              <h4 className="font-semibold text-sm mb-3 text-yellow-800 dark:text-yellow-300">⚠️ Phân tích rủi ro</h4>
              <div className="text-sm space-y-2 text-yellow-700 dark:text-yellow-300">
                {parseInt(sellQuantity) === userHolding.quantity && (
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    <span>Bạn sẽ bán toàn bộ vị thế trong {stock.symbol}</span>
                  </div>
                )}
                {stock.currentPrice < userHolding.avgBuyPrice && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Giá hiện tại thấp hơn giá mua trung bình - cân nhắc việc chờ phục hồi</span>
                  </div>
                )}
                {marketData && marketData.change < 0 && (
                  <div className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>Cổ phiếu đang giảm giá trong phiên hôm nay ({marketData.changePct.toFixed(2)}%)</span>
                  </div>
                )}
                {parseInt(sellQuantity) > userHolding.quantity * 0.5 && (
                  <div className="flex items-start gap-2">
                    <span className="text-yellow-500">•</span>
                    <span>Bạn đang bán hơn 50% vị thế - cân nhắc chiến lược đầu tư dài hạn</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span>Giao dịch sẽ được thực hiện với giá thị trường hiện tại</span>
                </div>
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
                <span>Số tiền bán sẽ được cộng vào tài khoản của bạn</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Việc bán có thể có ý nghĩa về thuế - tham khảo cố vấn tài chính</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                <span>Giao dịch không thể hoàn tác sau khi xác nhận</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="btn btn-outline flex-1"
              disabled={sellLoading}
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSellStock}
              className="btn btn-primary flex-1"
              disabled={sellLoading || !sellQuantity || sellQuantity <= 0}
            >
              {sellLoading ? 'Đang xử lý...' : '📉 Xác nhận bán ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellModal;