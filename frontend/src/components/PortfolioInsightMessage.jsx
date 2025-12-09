/*
  File: components/PortfolioInsightMessage.jsx
  Purpose: Render portfolio insight message with charts and metrics
*/

import React from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTheme } from '../contexts/ThemeContext';
import TextMessage from './TextMessage';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

function PortfolioInsightMessage({ text, data }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  if (!data) {
    return <TextMessage text={text} />;
  }
  
  return (
    <div className={`max-w-[90%] space-y-4 p-3 rounded-lg shadow-sm ${
      isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-800'
    }`}>
      {/* Text description */}
      <p className="text-sm whitespace-pre-line break-words">{text}</p>
      
      {/* Key metrics */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {data.total_value !== undefined && (
          <div>
            <div className="opacity-70 text-xs">Total Value</div>
            <div className="font-semibold">${data.total_value.toLocaleString()}</div>
          </div>
        )}
        {data.profit_loss !== undefined && (
          <div>
            <div className="opacity-70 text-xs">Profit/Loss</div>
            <div className={`font-semibold ${
              data.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {data.profit_loss >= 0 ? '+' : ''}${data.profit_loss.toLocaleString()}
              {data.profit_loss_pct !== undefined && (
                <span className="ml-1">
                  ({data.profit_loss_pct >= 0 ? '+' : ''}{data.profit_loss_pct.toFixed(2)}%)
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Distribution by stock (Pie Chart) */}
      {data.distribution_by_stock && data.distribution_by_stock.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold">📊 Distribution by Stock</div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.distribution_by_stock}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={60}
                  label={(entry) => `${entry.name}: ${entry.percentage?.toFixed(1) || 0}%`}
                >
                  {data.distribution_by_stock.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: isDark ? '#374151' : '#ffffff',
                    border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Growth over time (Line Chart) */}
      {data.growth_data && data.growth_data.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold">📈 Growth Over Time</div>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.growth_data}>
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: isDark ? '#9ca3af' : '#6b7280' }}
                />
                <Tooltip 
                  formatter={(value) => `$${value.toLocaleString()}`}
                  contentStyle={{
                    backgroundColor: isDark ? '#374151' : '#ffffff',
                    border: `1px solid ${isDark ? '#4b5563' : '#e5e7eb'}`,
                    borderRadius: '6px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortfolioInsightMessage;

