import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();

  return (
    <nav className="navbar">
      <div className="container nav-inner">
        <Link to="/" className="brand-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M4 16L10 10L14 14L20 8" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4 4V20H20" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span>{t('app.brand')}</span>
          <span className="badge">{t('app.beta')}</span>
        </Link>

        <div className="flex items-center gap-3">
          <button className="btn btn-outline" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? '🌙' : '☀️'}
          </button>

          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="form-input"
            style={{ width: 110, padding: '.5rem .75rem', height: 40 }}
            aria-label="Select language"
          >
            <option value="vi">Tiếng Việt</option>
            <option value="en">English</option>
          </select>

          {isAuthenticated ? (
            <>
              <span className="text-muted">{user?.username}</span>
              <button className="btn btn-outline" onClick={logout}>{t('actions.logout')}</button>
            </>
          ) : (
            <>
              {location.pathname !== '/login' && (
                <Link to="/login" className="btn btn-secondary">{t('actions.login')}</Link>
              )}
              {location.pathname !== '/register' && (
                <Link to="/register" className="btn btn-primary">{t('actions.register')}</Link>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
