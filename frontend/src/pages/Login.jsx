import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(formData.email, formData.password);
    if (result.success) navigate('/dashboard'); else setError(result.message);
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-hero">
        <div className="auth-blob"></div>
        <div className="brand">
          <h1>Welcome back to Stock Cap</h1>
          <p className="text-muted">Trade smarter. Track faster. Grow better.</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="card" style={{ width: '100%', maxWidth: 420 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Sign in</div>
              <div className="card-subtle">Enter your credentials to access your account</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input id="email" name="email" type="email" required className="form-input" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" name="password" type="password" required className="form-input" placeholder="Enter your password" value={formData.password} onChange={handleChange} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          <div className="mt-4 text-center text-muted">
            Don't have an account?{' '}
            <Link to="/register" className="" style={{ color: 'var(--accent)' }}>Create account</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
