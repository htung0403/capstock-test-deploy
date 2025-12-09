/*
  File: components/PriceForecastMessage.jsx
  Purpose: Render price forecast message with chart, confidence, and trend
*/

import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import TextMessage from './TextMessage';

function PriceForecastMessage({ text, data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  if (!data) {
    return <TextMessage text={text} />;
  }
  
  const chartData = data.forecast_chart_data || [];
  const confidence = data.confidence || 0;
  const trend = data.trend || 'Neutral';
  
  return (
    <div className={`max-w-[90%] space-y-3 p-3 rounded-lg shadow-sm ${
      isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
    }`}>
      {/* Text description */}
      <p className="text-sm whitespace-pre-line break-words">{text}</p>
      
      {/* Chart */}
      {chartData.length > 0 && (
        <div className="w-full h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#4b5563' : '#e5e7eb'} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
                stroke={isDark ? '#6b7280' : '#9ca3af'}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
                stroke={isDark ? '#6b7280' : '#9ca3af'}
              />
              <Tooltip 
                formatter={(value) => `$${value.toFixed(2)}`}
                contentStyle={{
                  backgroundColor: isDark ? '#374151' : '#ffffff',
                  border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                  borderRadius: '6px',
                  color: isDark ? '#f3f4f6' : '#111827'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {data.current_price !== undefined && (
          <div>
            <span className="opacity-70">Current:</span>{' '}
            <span className="font-semibold">${data.current_price.toFixed(2)}</span>
          </div>
        )}
        {data.predicted_price !== undefined && (
          <div>
            <span className="opacity-70">Predicted:</span>{' '}
            <span className="font-semibold">${data.predicted_price.toFixed(2)}</span>
          </div>
        )}
        {data.predicted_change_pct !== undefined && (
          <div>
            <span className="opacity-70">Change:</span>{' '}
            <span className={`font-semibold ${data.predicted_change_pct >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {data.predicted_change_pct >= 0 ? '+' : ''}{data.predicted_change_pct.toFixed(2)}%
            </span>
          </div>
        )}
        {data.model_type && (
          <div>
            <span className="opacity-70">Model:</span>{' '}
            <span className="font-semibold">{data.model_type}</span>
          </div>
        )}
      </div>
      
      {/* Confidence bar */}
      {confidence > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span>Confidence</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className={`w-full rounded-full h-2 ${
            isDark ? 'bg-gray-600' : 'bg-gray-300'
          }`}>
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all" 
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Trend indicator */}
      {trend && (
        <div className="flex items-center space-x-2 text-xs">
          <span>Trend:</span>
          <span className={`font-semibold ${
            trend === 'Bullish' ? 'text-green-500' : 
            trend === 'Bearish' ? 'text-red-500' : 
            'text-gray-500'
          }`}>
            {trend === 'Bullish' ? '🟢' : trend === 'Bearish' ? '🔴' : '⚪'} {trend}
          </span>
        </div>
      )}
    </div>
  );
}

export default PriceForecastMessage;

