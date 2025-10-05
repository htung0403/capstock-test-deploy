import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) return setError('Passwords do not match');
    if (formData.password.length < 6) return setError('Password must be at least 6 characters');

    setLoading(true);
    const result = await register(formData.username, formData.email, formData.password);
    if (result.success) navigate('/dashboard'); else setError(result.message);
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-hero">
        <div className="auth-blob"></div>
        <div className="brand">
          <h1>Create your Stock Cap account</h1>
          <p className="text-muted">Join and start building your portfolio today</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="card" style={{ width: '100%', maxWidth: 460 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Create account</div>
              <div className="card-subtle">It only takes a minute to get started</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '0.5rem' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username" className="form-label">Username</label>
              <input id="username" name="username" type="text" required className="form-input" placeholder="yourname" value={formData.username} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input id="email" name="email" type="email" required className="form-input" placeholder="you@example.com" value={formData.email} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" name="password" type="password" required className="form-input" placeholder="Enter your password" value={formData.password} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required className="form-input" placeholder="Re-enter your password" value={formData.confirmPassword} onChange={handleChange} />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="mt-4 text-center text-muted">
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--accent)' }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
