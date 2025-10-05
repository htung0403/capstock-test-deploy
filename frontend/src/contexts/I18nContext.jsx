import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const I18nContext = createContext();

const messages = {
  en: {
    app: { brand: 'Stock Cap', beta: 'Beta' },
    auth: {
      welcome: 'Welcome back to Stock Cap',
      tagline: 'Trade smarter. Track faster. Grow better.',
      signIn: 'Sign in',
      signUp: 'Create account',
      email: 'Email',
      password: 'Password',
      confirm: 'Confirm password',
      haveAccount: 'Already have an account?',
      noAccount: "Don't have an account?",
      createHere: 'Create account',
      signInHere: 'Sign in',
      invalid: 'Invalid credentials',
      creating: 'Creating account...',
      signing: 'Signing in...'
    },
    dashboard: {
      welcome: 'Welcome back, {name}',
      overview: 'Your personalized trading overview',
      balance: 'Available Balance',
      market: 'Market Watch',
      top: 'Top tickers',
      portfolio: 'Your Portfolio',
      recent: 'Recent Transactions',
      last30: 'Last 30 days',
      quick: 'Quick Actions',
      common: 'Common tasks',
    },
    actions: { login: 'Login', register: 'Register', logout: 'Logout', buy: 'Buy Stock', sell: 'Sell Stock', deposit: 'Deposit Funds', withdraw: 'Withdraw Funds' }
  },
  vi: {
    app: { brand: 'Stock Cap', beta: 'Beta' },
    auth: {
      welcome: 'Chào mừng quay lại Stock Cap',
      tagline: 'Giao dịch thông minh. Theo dõi nhanh. Tăng trưởng tốt.',
      signIn: 'Đăng nhập',
      signUp: 'Tạo tài khoản',
      email: 'Email',
      password: 'Mật khẩu',
      confirm: 'Xác nhận mật khẩu',
      haveAccount: 'Đã có tài khoản?',
      noAccount: 'Chưa có tài khoản?',
      createHere: 'Tạo tài khoản',
      signInHere: 'Đăng nhập',
      invalid: 'Sai thông tin đăng nhập',
      creating: 'Đang tạo tài khoản...',
      signing: 'Đang đăng nhập...'
    },
    dashboard: {
      welcome: 'Chào mừng quay lại, {name}',
      overview: 'Tổng quan giao dịch cá nhân hóa',
      balance: 'Số dư khả dụng',
      market: 'Thị trường',
      top: 'Mã nổi bật',
      portfolio: 'Danh mục đầu tư',
      recent: 'Giao dịch gần đây',
      last30: '30 ngày qua',
      quick: 'Tác vụ nhanh',
      common: 'Thường dùng',
    },
    actions: { login: 'Đăng nhập', register: 'Đăng ký', logout: 'Đăng xuất', buy: 'Mua cổ phiếu', sell: 'Bán cổ phiếu', deposit: 'Nạp tiền', withdraw: 'Rút tiền' }
  }
};

export const useI18n = () => {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
};

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState('vi');

  useEffect(() => {
    const saved = localStorage.getItem('lang');
    if (saved === 'vi' || saved === 'en') setLang(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const t = useMemo(() => {
    const dict = messages[lang] || messages.vi;
    return (path, params = {}) => {
      const keys = path.split('.');
      let val = keys.reduce((acc, k) => (acc ? acc[k] : undefined), dict);
      if (typeof val === 'string') {
        Object.entries(params).forEach(([k, v]) => {
          val = val.replace(`{${k}}`, v);
        });
      }
      return val ?? path;
    };
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};
