import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (opts: { type?: ToastType; message: string; title?: string; durationMs?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(1);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((opts: { type?: ToastType; message: string; title?: string; durationMs?: number }) => {
    const id = idRef.current++;
    const item: ToastItem = {
      id,
      type: opts.type ?? 'info',
      title: opts.title,
      message: opts.message,
      durationMs: opts.durationMs ?? 3000,
    };
    setToasts(prev => [...prev, item]);
    if (item.durationMs > 0) {
      window.setTimeout(() => removeToast(id), item.durationMs);
    }
  }, [removeToast]);

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
}

function iconFor(type: ToastType) {
  switch (type) {
    case 'success': return 'ri-checkbox-circle-line';
    case 'error': return 'ri-error-warning-line';
    case 'warning': return 'ri-alert-line';
    case 'info':
    default: return 'ri-information-line';
  }
}

function colorFor(type: ToastType) {
  switch (type) {
    case 'success': return { bg: 'bg-green-100', text: 'text-green-800', ring: 'ring-green-200' };
    case 'error': return { bg: 'bg-red-100', text: 'text-red-800', ring: 'ring-red-200' };
    case 'warning': return { bg: 'bg-yellow-100', text: 'text-yellow-800', ring: 'ring-yellow-200' };
    case 'info':
    default: return { bg: 'bg-blue-100', text: 'text-blue-800', ring: 'ring-blue-200' };
  }
}

function Toaster({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[60] space-y-3">
      {toasts.map(t => {
        const c = colorFor(t.type);
        return (
          <div key={t.id} className={`flex items-start gap-3 p-4 rounded-lg shadow-lg ${c.bg} ${c.ring} ring-1 min-w-[260px] max-w-sm`}>
            <div className={`mt-0.5 ${c.text}`}>
              <i className={`${iconFor(t.type)} text-xl`}></i>
            </div>
            <div className="flex-1">
              {t.title && <div className={`font-medium ${c.text}`}>{t.title}</div>}
              <div className="text-sm text-gray-800">{t.message}</div>
            </div>
            <button className="text-gray-500 hover:text-gray-700" onClick={() => onClose(t.id)}>
              <i className="ri-close-line"></i>
            </button>
          </div>
        );
      })}
    </div>
  );
}


