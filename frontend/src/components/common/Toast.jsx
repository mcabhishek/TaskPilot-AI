import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3500) => {
    const id = Date.now().toString() + Math.random().toString(36).slice(2, 6);
    setToasts(prev => [...prev, { id, message, type }]);

    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-container" role="region" aria-live="polite">
        {toasts.map(t => {
          const icons = {
            success: <CheckCircle2 size={16} color="var(--success)" />,
            error: <AlertCircle size={16} color="var(--error)" />,
            warning: <AlertTriangle size={16} color="var(--warning)" />,
            info: <Info size={16} color="var(--info)" />,
          };

          return (
            <div key={t.id} className="toast" style={{
              borderLeft: `3px solid var(--${t.type === 'error' ? 'error' : t.type === 'success' ? 'success' : t.type === 'warning' ? 'warning' : 'info'})`
            }}>
              {icons[t.type]}
              <span style={{ color: 'var(--primary-text)', fontWeight: 500 }}>{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                style={{ marginLeft: 'auto', padding: '0.2rem', color: 'var(--text-muted)' }}
                aria-label="Close notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      success: (m) => console.log('Toast:', m),
      error: (m) => console.error('Toast Error:', m),
      warning: (m) => console.warn('Toast Warning:', m),
      info: (m) => console.info('Toast Info:', m),
    };
  }
  return context;
}
