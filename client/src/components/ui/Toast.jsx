import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { bg: '#ecfdf5', border: '#6ee7b7', color: '#065f46', dot: '#10b981' },
  error:   { bg: '#fef2f2', border: '#fca5a5', color: '#991b1b', dot: '#ef4444' },
  warning: { bg: '#fffbeb', border: '#fcd34d', color: '#92400e', dot: '#f59e0b' },
  info:    { bg: '#eff6ff', border: '#93c5fd', color: '#1e40af', dot: '#3b82f6' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ message, type = 'success' }) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 340,
        pointerEvents: 'none',
      }}>
        {toasts.map((t) => {
          const s = TOAST_STYLES[t.type] ?? TOAST_STYLES.success;
          return (
            <div
              key={t.id}
              style={{
                backgroundColor: s.bg,
                border: `1px solid ${s.border}`,
                borderLeft: `3px solid ${s.dot}`,
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 13,
                color: s.color,
                fontWeight: 500,
                boxShadow: '0 4px 16px -2px rgb(0 0 0 / 0.1)',
                pointerEvents: 'auto',
                animation: 'fadeSlideIn 0.2s ease',
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
