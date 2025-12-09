import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../components/Toast';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { show } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/users/forgot-password', { email });
      setSuccess(true);
      show(response.data.message || 'Password reset email sent!', 'success');
    } catch (err) {
      const message = err.response?.data?.message || 'Failed to send reset email';
      setError(message);
      show(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-hero">
        <div className="auth-blob"></div>
        <div className="brand">
          <h1>Forgot Password?</h1>
          <p className="text-muted">Enter your email to receive a password reset link</p>
        </div>
      </div>
      <div className="flex items-center justify-center p-8">
        <div className="card" style={{ width: '100%', maxWidth: 420 }}>
          <div className="card-header">
            <div>
              <div className="card-title">Reset Password</div>
              <div className="card-subtle">We'll send you a link to reset your password</div>
            </div>
          </div>

          {success ? (
            <div className="mb-4 p-4" style={{ background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: '0.5rem', color: 'var(--text)' }}>
              <p className="mb-2">✅ Password reset email sent!</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Please check your email for the reset link. The link will expire in 1 hour.
              </p>
              <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>
                <strong>Note:</strong> In development mode, check the server console for the reset link.
              </p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3" style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.25)', borderRadius: '0.5rem', color: 'var(--text)' }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="form-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <button type="submit" disabled={loading} className="btn btn-primary w-full">
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            </>
          )}

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

export default ForgotPasswordPage;

