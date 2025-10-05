import React, { createContext, useContext, useCallback, useState } from 'react';

const ToastContext = createContext();

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((message, type = 'info', timeout = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, message, type }]);
    if (timeout) setTimeout(() => remove(id), timeout);
  }, [remove]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 50 }}>
        {toasts.map((t) => (
          <div key={t.id} className="card" style={{ minWidth: 260, borderLeft: `3px solid ${t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : '#22d3ee'}` }}>
            <div className="flex items-center justify-between">
              <span>{t.message}</span>
              <button className="btn btn-outline" onClick={() => remove(t.id)} style={{ padding: '.25rem .5rem' }}>×</button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
