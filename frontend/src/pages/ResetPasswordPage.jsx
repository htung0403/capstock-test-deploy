import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/Toast';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { show } = useToast();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
    } else {
      setError('Invalid reset link. Please request a new password reset.');
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    setLoading(true);

    try {
      await api.post('/users/reset-password', {
        token,
        password: formData.password,
      });
      setSuccess(true);
      show('Password reset successful! Redirecting to login...', 'success');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to reset password';
      setError(message);
      show(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-wrapper">
        <div className="auth-hero">
          <div className="auth-blob"></div>
          <div className="brand">
            <h1>Password Reset Successful!</h1>
            <p className="text-muted">Redirecting to login...</p>
          </div>
        </div>
        <div className="flex items-center justify-center p-8">
          <div className="card" style={{ width: '100%', maxWidth: 420 }}>
            <div className="mb-4 p-4" style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              <p>✅ Your password has been reset successfully!</p>
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                You can now login with your new password.
              </p>
            </div>
            <Link to="/login" className="btn btn-primary w-full">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-hero">
        <div className="auth-blob"></div>
        <div className="brand">
          <h1>Reset Password</h1>
          <p className="text-muted">Enter your new password</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="card" style={{ width: '100%', maxWidth: 420 }}>
          <div className="card-header">
            <div>
              <div className="card-title">New Password</div>
              <div className="card-subtle">Choose a strong password for your account</div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              {error}
            </div>
          )}

          {!token && (
            <div className="mb-4 p-3" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              Invalid or missing reset token. Please request a new password reset.
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password" className="form-label">New Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="form-input"
                placeholder="Enter new password (min 8 characters)"
                value={formData.password}
                onChange={handleChange}
                minLength={8}
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="form-input"
                placeholder="Confirm new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                minLength={8}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !token}
              className="btn btn-primary w-full"
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>

          <div className="mt-4 text-center text-muted">
            Remember your password?{' '}
            <Link to="/login" className="" style={{ color: 'var(--accent)' }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

