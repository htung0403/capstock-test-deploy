/*
  File: components/OrderForm.jsx
  Purpose: Order form component with support for Market, Limit, Stop, and Stop-Limit orders
*/
import { useState } from 'react';

const OrderForm = ({ 
  stock, 
  orderType: initialOrderType = 'BUY', 
  onSubmit, 
  onCancel,
  userBalance = 0 
}) => {
  const [formData, setFormData] = useState({
    type: initialOrderType, // BUY or SELL
    orderType: 'MARKET', // MARKET, LIMIT, STOP, STOP_LIMIT
    quantity: '',
    limitPrice: '',
    stopPrice: '',
    expiresAt: ''
  });

  const [errors, setErrors] = useState({});

  // Calculate estimated cost/proceeds
  const getEstimatedTotal = () => {
    if (!formData.quantity) return 0;
    
    let price = 0;
    if (formData.orderType === 'MARKET') {
      price = stock.currentPrice;
    } else if (formData.orderType === 'LIMIT') {
      price = formData.limitPrice || stock.currentPrice;
    } else if (formData.orderType === 'STOP') {
      price = formData.stopPrice || stock.currentPrice;
    } else if (formData.orderType === 'STOP_LIMIT') {
      price = formData.limitPrice || stock.currentPrice;
    }
    
    return price * formData.quantity;
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate quantity
    if (!formData.quantity || formData.quantity <= 0) {
      newErrors.quantity = 'Số lượng phải lớn hơn 0';
    }

    // Validate based on order type
    if (formData.orderType === 'LIMIT') {
      if (!formData.limitPrice || formData.limitPrice <= 0) {
        newErrors.limitPrice = 'Giá giới hạn phải lớn hơn 0';
      }
    }

    if (formData.orderType === 'STOP') {
      if (!formData.stopPrice || formData.stopPrice <= 0) {
        newErrors.stopPrice = 'Giá kích hoạt phải lớn hơn 0';
      }
    }

    if (formData.orderType === 'STOP_LIMIT') {
      if (!formData.stopPrice || formData.stopPrice <= 0) {
        newErrors.stopPrice = 'Giá kích hoạt phải lớn hơn 0';
      }
      if (!formData.limitPrice || formData.limitPrice <= 0) {
        newErrors.limitPrice = 'Giá giới hạn phải lớn hơn 0';
      }
    }

    // Validate balance for BUY orders
    if (formData.type === 'BUY') {
      const estimatedTotal = getEstimatedTotal();
      if (estimatedTotal > userBalance) {
        newErrors.balance = `Số dư không đủ. Cần $${estimatedTotal.toFixed(2)}, có $${userBalance.toFixed(2)}`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Prepare order data
    const orderData = {
      stockSymbol: stock.symbol,
      type: formData.type,
      orderType: formData.orderType,
      quantity: parseInt(formData.quantity)
    };

    // Add prices based on order type
    if (formData.orderType === 'LIMIT' || formData.orderType === 'STOP_LIMIT') {
      orderData.limitPrice = parseFloat(formData.limitPrice);
    }

    if (formData.orderType === 'STOP' || formData.orderType === 'STOP_LIMIT') {
      orderData.stopPrice = parseFloat(formData.stopPrice);
    }

    if (formData.expiresAt) {
      orderData.expiresAt = new Date(formData.expiresAt).toISOString();
    }

    onSubmit(orderData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          Đặt lệnh {stock.symbol}
        </h3>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
      </div>

      {/* Stock Info */}
      <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
        <div className="flex justify-between">
          <span className="text-gray-600 dark:text-gray-300">Giá hiện tại:</span>
          <span className="font-bold text-gray-900 dark:text-white">
            ${stock.currentPrice?.toFixed(2)}
          </span>
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-gray-600 dark:text-gray-300">Số dư:</span>
          <span className="font-bold text-green-600 dark:text-green-400">
            ${userBalance.toFixed(2)}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Order Type Tabs (BUY/SELL) */}
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => handleChange('type', 'BUY')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              formData.type === 'BUY'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            MUA
          </button>
          <button
            type="button"
            onClick={() => handleChange('type', 'SELL')}
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              formData.type === 'SELL'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            BÁN
          </button>
        </div>

        {/* Order Type Select */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Loại lệnh
          </label>
          <select
            value={formData.orderType}
            onChange={(e) => handleChange('orderType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="MARKET">Market - Thực hiện ngay</option>
            <option value="LIMIT">Limit - Giới hạn giá</option>
            <option value="STOP">Stop - Kích hoạt tại giá</option>
            <option value="STOP_LIMIT">Stop-Limit - Kích hoạt + Giới hạn</option>
          </select>
        </div>

        {/* Order Type Description */}
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
          {formData.orderType === 'MARKET' && (
            <p className="text-blue-800 dark:text-blue-300">
              📊 <strong>Market:</strong> Lệnh được thực hiện ngay lập tức tại giá thị trường hiện tại
            </p>
          )}
          {formData.orderType === 'LIMIT' && (
            <p className="text-blue-800 dark:text-blue-300">
              🎯 <strong>Limit:</strong> Lệnh chỉ được thực hiện khi giá đạt mức giới hạn bạn đặt
            </p>
          )}
          {formData.orderType === 'STOP' && (
            <p className="text-blue-800 dark:text-blue-300">
              ⚠️ <strong>Stop:</strong> Khi giá chạm mức kích hoạt, lệnh Market sẽ được đặt tự động
            </p>
          )}
          {formData.orderType === 'STOP_LIMIT' && (
            <p className="text-blue-800 dark:text-blue-300">
              🎚️ <strong>Stop-Limit:</strong> Khi giá chạm mức kích hoạt, lệnh Limit sẽ được đặt
            </p>
          )}
        </div>

        {/* Quantity */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Số lượng
          </label>
          <input
            type="number"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleChange('quantity', e.target.value)}
            placeholder="Nhập số lượng cổ phiếu"
            className={`w-full px-3 py-2 border rounded-lg 
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                     ${errors.quantity ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
          />
          {errors.quantity && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.quantity}</p>
          )}
        </div>

        {/* Limit Price (for LIMIT and STOP_LIMIT) */}
        {(formData.orderType === 'LIMIT' || formData.orderType === 'STOP_LIMIT') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Giá giới hạn ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.limitPrice}
              onChange={(e) => handleChange('limitPrice', e.target.value)}
              placeholder={`Giá hiện tại: $${stock.currentPrice?.toFixed(2)}`}
              className={`w-full px-3 py-2 border rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                       ${errors.limitPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.limitPrice && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.limitPrice}</p>
            )}
          </div>
        )}

        {/* Stop Price (for STOP and STOP_LIMIT) */}
        {(formData.orderType === 'STOP' || formData.orderType === 'STOP_LIMIT') && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Giá kích hoạt ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formData.stopPrice}
              onChange={(e) => handleChange('stopPrice', e.target.value)}
              placeholder={`Giá hiện tại: $${stock.currentPrice?.toFixed(2)}`}
              className={`w-full px-3 py-2 border rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400
                       ${errors.stopPrice ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}`}
            />
            {errors.stopPrice && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.stopPrice}</p>
            )}
          </div>
        )}

        {/* Expiration Date (optional for non-MARKET orders) */}
        {formData.orderType !== 'MARKET' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Hết hạn (tùy chọn)
            </label>
            <input
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => handleChange('expiresAt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Để trống nếu không có thời hạn
            </p>
          </div>
        )}

        {/* Estimated Total */}
        {formData.quantity && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-300">
                {formData.type === 'BUY' ? 'Tổng chi phí:' : 'Tổng thu về:'}
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                ${getEstimatedTotal().toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Balance Error */}
        {errors.balance && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded">
            <p className="text-sm text-red-600 dark:text-red-400">{errors.balance}</p>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 
                     rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-colors ${
              formData.type === 'BUY'
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-red-500 hover:bg-red-600 text-white'
            }`}
          >
            {formData.type === 'BUY' ? 'Đặt lệnh MUA' : 'Đặt lệnh BÁN'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderForm;
