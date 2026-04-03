import React, { createContext, useContext, useMemo, useState } from 'react';

type Toast = {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
  leaving?: boolean;
};

type ToastContextType = {
  toasts: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  remove: (id: string) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const EXIT_MS = 260; // длительность анимации скрытия должна совпадать с CSS

  const beginLeave = (id: string) => {
    setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
  };
  const api = useMemo<ToastContextType>(
    () => ({
      toasts,
      push: (t) => {
        const id = Math.random().toString(36).slice(2);
        setToasts((prev) => [...prev, { id, leaving: false, ...t }]);
        // Авто-скрытие с анимацией
        window.setTimeout(() => {
          beginLeave(id);
        }, Math.max(0, 3000 - EXIT_MS));
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== id));
        }, 3000);
      },
      remove: (id) => setToasts((prev) => prev.filter((x) => x.id !== id)),
    }),
    [toasts],
  );
  // Глобальный доступ: window.__app_toast({ type, title, description })
  if (typeof window !== 'undefined') {
    (window as any).__app_toast = (payload: { type: Toast['type']; title: string; description?: string }) => api.push(payload as any);
  }
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-6 z-50 flex w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 flex-col items-center gap-3 px-2">
        {toasts.map((t, idx) => {
          const tone =
            t.type === 'success'
              ? 'border-green-300 bg-green-50 text-green-800 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200'
              : t.type === 'error'
              ? 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
              : 'border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-200';
          return (
            <div
              key={t.id}
              role="alert"
              aria-live="polite"
              className={`pointer-events-auto rounded-md border px-4 py-3 shadow-lg will-change-transform ${tone} ${
                t.leaving ? 'toast-exit' : 'toast-enter'
              }`}
              style={{ animationDelay: `${Math.min(idx * 50, 300)}ms` }}
              onClick={() => {
                if (!t.leaving) {
                  beginLeave(t.id);
                  window.setTimeout(() => api.remove(t.id), EXIT_MS);
                }
              }}
            >
              <div className="font-medium">{t.title}</div>
              {t.description && <div className="text-sm opacity-80">{t.description}</div>}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}


