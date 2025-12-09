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
        <div className="flex items-center">
          <Link to="/" className="brand-mark">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 16L10 10L14 14L20 8" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4 4V20H20" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>{t('app.brand')}</span>
            <span className="badge">{t('app.beta')}</span>
          </Link>
          
          {/* News link next to brand mark */}
          {isAuthenticated && (
            <Link
              to="/news"
              className="ml-3 flex items-center text-sm font-medium transition-colors hover:text-cyan-400"
              style={{ color: 'var(--text)' }}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 002 2h2m-2 2l4-4m0 0l4-4m-4 4L9 9m3-5h4a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V6a2 2 0 012-2zm0 0z" /></svg>
              News
            </Link>
          )}
          {/* Market Heatmap link next to News */}
          {isAuthenticated && (
            <Link
              to="/market-heatmap"
              className="ml-3 flex items-center text-sm font-medium transition-colors hover:text-cyan-400"
              style={{ color: 'var(--text)' }}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 9c1.657 0 3 .895 3 2s-1.343 2-3 2c-.628 0-1.213-.117-1.743-.323l-.15.011A3.5 3.5 0 005.15 15.15L3 21l6-3-3.5-3.5c.316-.271.666-.513 1.05-.722l-.001-.001A7.001 7.001 0 0118 10a7 7 0 01-2.343 5.657z"/></svg>
              Heatmap
            </Link>
          )}
          {/* Portfolio Analytics link next to Heatmap */}
          {isAuthenticated && (
            <Link
              to="/portfolio-analytics"
              className="ml-3 flex items-center text-sm font-medium transition-colors hover:text-cyan-400"
              style={{ color: 'var(--text)' }}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Portfolio
            </Link>
          )}
        </div>

        {/* Original News link - now removed */}
        {/* {isAuthenticated && (
          <Link
            to="/news"
            className="ml-4 text-sm font-medium transition-colors hover:text-cyan-400"
            style={{ color: 'var(--text)' }}
          >
            Tin tức
          </Link>
        )} */}

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

                    {/* Writer Links */}
                    {/* (user?.role === 'WRITER' || user?.role === 'ADMIN') && (*/}
                      <>
                        <Link
                          to="/writer/dashboard"
                          className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                          style={{ color: 'var(--text)' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          Writer Dashboard
                        </Link>
                        <Link
                          to="/writer/new-article"
                          className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                          style={{ color: 'var(--text)' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          New Article
                        </Link>
                      </>
                    {/* )*/}

                    {/* Editor Links */}
                    {/* (user?.role === 'EDITOR' || user?.role === 'ADMIN') && (*/}
                      <>
                        <Link
                          to="/editor/dashboard"
                          className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                          style={{ color: 'var(--text)' }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002-2h2a2 2 0 002 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                          Editor Dashboard
                        </Link>
                      </>
                    {/* )*/}


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

                    {/* Admin-only: User Management */}
                    {(user?.role === 'ADMIN' || user?.roles?.includes('ADMIN')) && (
                      <Link
                        to="/admin/users"
                        className="flex items-center gap-3 px-4 py-2 text-sm transition-colors"
                        style={{ color: 'var(--text)' }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(148,163,184,0.1)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                        User Management
                      </Link>
                    )}

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
