import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { fetchStocks(); }, []);

  const fetchStocks = async () => {
    try {
      const response = await api.get('/stocks');
      setStocks(response.data);
    } catch (err) {
      setError('Failed to fetch stocks');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero header */}
      <section className="container" style={{ paddingTop: '2rem', paddingBottom: '1rem' }}>
        <div className="card" style={{ overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(600px 300px at 80% -10%, rgba(34,211,238,.15), transparent)' }}></div>
          <div className="flex items-center justify-between" style={{ position: 'relative' }}>
            <div>
              <h1 className="card-title" style={{ fontSize: '1.5rem' }}>Welcome back, {user?.username}</h1>
              <p className="card-subtle">Your personalized trading overview</p>
            </div>
            <div className="card">
              <div className="text-muted mb-2">Available Balance</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>${user?.balance || 0}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <main className="container" style={{ paddingBottom: '2rem' }}>
        {error && (
          <div className="mb-6 p-4" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '0.75rem' }}>
            {error}
          </div>
        )}

        <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
          {/* Stocks Section */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Market Watch</div>
              <div className="card-subtle">Top tickers</div>
            </div>
            {stocks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {stocks.slice(0, 8).map((stock) => (
                  <div key={stock._id} className="flex justify-between items-center" style={{ padding: '.75rem', background: 'rgba(148,163,184,.06)', borderRadius: '.75rem', border: '1px solid rgba(148,163,184,.1)' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{stock.symbol}</div>
                      <div className="text-muted" style={{ fontSize: '.875rem' }}>{stock.name}</div>
                    </div>
                    <div className="text-right">
                      <div style={{ fontWeight: 700 }}>${stock.currentPrice}</div>
                      <div className="text-muted" style={{ fontSize: '.75rem' }}>per share</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted">No stocks available</p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {/* Portfolio Section */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Your Portfolio</div>
                <span className="card-subtle">Overview</span>
              </div>
              <p className="text-muted">Portfolio data will be displayed here</p>
            </div>

            {/* Recent Transactions */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">Recent Transactions</div>
                <span className="card-subtle">Last 30 days</span>
              </div>
              <p className="text-muted">Transaction history will be displayed here</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 card">
          <div className="card-header">
            <div className="card-title">Quick Actions</div>
            <span className="card-subtle">Common tasks</span>
          </div>
          <div className="flex gap-3">
            <button className="btn btn-primary">Buy Stock</button>
            <button className="btn btn-secondary">Sell Stock</button>
            <button className="btn btn-outline">Deposit Funds</button>
            <button className="btn btn-outline">Withdraw Funds</button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
