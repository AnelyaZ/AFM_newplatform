import React, { useEffect, useRef, useState } from 'react';

type Props = {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  variant?: 'default' | 'danger';
  confirmText?: string;
  cancelText?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

export default function ConfirmDialog({ open, title, description, variant = 'default', confirmText = 'Подтвердить', cancelText = 'Отмена', onClose, onConfirm }: Props) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => confirmRef.current?.focus(), 30);
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => { document.removeEventListener('keydown', onKey); clearTimeout(t); cancelAnimationFrame(raf); setEntered(false); };
  }, [open, onClose]);

  if (!open) return null;
  const isDanger = variant === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
      <div
        className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${entered ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={`relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-black/10 bg-white/90 shadow-2xl ring-1 ring-black/10 backdrop-blur-md transition-all duration-200 ease-out dark:border-white/10 dark:bg-neutral-900/90 dark:ring-white/10 ${entered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1 scale-95'}`}
      >
        <div className="flex items-start gap-3 p-5">
          <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-full ${isDanger ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'}`} aria-hidden="true">
            {isDanger ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-gray-900 dark:text-white">{title}</div>
            {description ? <div className="mt-1 text-sm leading-relaxed text-gray-700 dark:text-white/80">{description}</div> : null}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-neutral-900/60">
          <button
            className="rounded-md px-3 py-1.5 text-sm text-gray-800 hover:bg-black/5 dark:text-white dark:hover:bg-white/10"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            ref={confirmRef}
            className={`rounded-md px-3 py-1.5 text-sm font-medium text-white ${isDanger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-sky-600 hover:bg-sky-500'}`}
            onClick={async () => { await onConfirm(); onClose(); }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


