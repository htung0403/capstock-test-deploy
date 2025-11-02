import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useI18n();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Đóng dropdown khi location thay đổi (navigate)
  useEffect(() => {
    setIsDropdownOpen(false);
  }, [location.pathname]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          <div className="scale-[0.3] origin-center">
            <ThemeToggle 
              isChecked={theme === 'light'} 
              onChange={toggleTheme}
            />
          </div>

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
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                style={{ 
                  color: 'var(--text)',
                }}
                aria-haspopup="true"
                aria-expanded={isDropdownOpen}
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block font-medium" style={{ color: 'var(--text)' }}>
                  {user?.username}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isDropdownOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 rounded-md shadow-lg ring-1 ring-opacity-5 focus:outline-none z-50"
                  style={{ 
                    minWidth: '240px', 
                    background: 'var(--card)',
                    borderColor: 'var(--border)',
                    boxShadow: theme === 'dark' 
                      ? '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' 
                      : '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div className="py-1">
                    {/* User Info Header */}
                    <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user?.username}</p>
                      <p className="text-xs" style={{ color: 'var(--muted)' }}>{user?.email}</p>
                      <p className="text-xs text-green-600 font-semibold mt-1">
                        ${user?.balance?.toLocaleString() || 0}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-opacity-50"
                      style={{ 
                        color: 'var(--text)',
                        ':hover': { backgroundColor: 'var(--muted)' }
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>

                    <Link
                      to="/payments"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--text)' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                      Nạp tiền
                    </Link>

                    <Link
                      to="/orders"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--text)' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Lệnh giao dịch
                    </Link>

                    {/* New Link for AI Chat Page */}
                    <Link
                      to="/chatbot"
                      className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                      style={{ color: 'var(--text)' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      onClick={() => setIsDropdownOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m-9-9a9 9 0 019-9m0 18c1.333 0 2.667-.45 4-1.35m-4 1.35c-1.333 0-2.667-.45-4-1.35m4-1.35V3m-4 10v1m-4-7v1m-4 7v1m14-7v1m4 7v1m-4-7V3m-4 10v1m-4-7v1m-4 7v1m14-7v1m4 7v1" />
                      </svg>
                      AI Chat
                    </Link>

                    <div className="border-t mt-1" style={{ borderColor: 'var(--border)' }}>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                        onMouseEnter={(e) => e.target.style.backgroundColor = theme === 'dark' ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.05)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        {t('actions.logout')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
