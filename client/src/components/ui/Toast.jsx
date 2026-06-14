import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

const TOAST_STYLES = {
  success: { bg: 'var(--color-emerald-bg)',  border: 'var(--color-emerald-border)', color: 'var(--color-emerald-text)', dot: 'var(--color-emerald-solid)' },
  error:   { bg: 'var(--color-red-bg)',      border: 'var(--color-red-border)',     color: 'var(--color-red-text)',     dot: 'var(--color-red-solid)' },
  warning: { bg: 'var(--color-amber-bg)',    border: 'var(--color-amber-border)',   color: 'var(--color-amber-text)',   dot: 'var(--color-amber-solid)' },
  info:    { bg: 'var(--color-blue-50)',     border: 'var(--color-blue-200)',       color: 'var(--color-blue-800)',     dot: 'var(--color-blue-500)' },
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
        gap: 'var(--space-2)',
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
                borderRadius: 'var(--radius-lg)',
                padding: '10px 14px',
                fontSize: 'var(--text-card)',
                color: s.color,
                fontWeight: 'var(--weight-medium)',
                fontFamily: 'var(--font-sans)',
                boxShadow: 'var(--shadow-toast)',
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
