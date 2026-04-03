import React, { useMemo, useState } from 'react';

export type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
  error?: string | null;
  withPasswordToggle?: boolean;
  type?: React.InputHTMLAttributes<HTMLInputElement>['type'];
};

export default function Input({ label, error, className = '', withPasswordToggle = false, type, ...rest }: InputProps) {
  const isPassword = (type || (rest as any).type) === 'password';
  const canToggle = withPasswordToggle || isPassword;
  const [visible, setVisible] = useState(false);
  const inputType = useMemo(() => {
    if (!canToggle) return type as any;
    return visible ? 'text' : 'password';
  }, [canToggle, visible, type]);

  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</span>}
      <div className="relative">
        <input
          type={inputType}
          className={`w-full rounded-lg border px-3 py-2 pr-10 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 dark:text-white dark:placeholder-white/40 ${
            error ? 'border-rose-500' : 'border-gray-300 dark:border-white/10'
          } bg-white dark:bg-white/5 ${className}`}
          {...rest}
        />
        {canToggle && (
          <button
            type="button"
            aria-label={visible ? 'Скрыть' : 'Показать'}
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-500 hover:text-gray-800 dark:text-white/60 dark:hover:text-white"
          >
            <span className="relative inline-block h-5 w-5">
              {/* Глаз */}
              <svg
                className={`absolute inset-0 h-5 w-5 transition-opacity duration-200 ${visible ? 'opacity-0' : 'opacity-100'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {/* Перечёркнутый глаз */}
              <svg
                className={`absolute inset-0 h-5 w-5 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C5.5 20 2 12 2 12a21.8 21.8 0 0 1 5.06-6.94M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 8 10 8a21.8 21.8 0 0 1-3.23 4.62M1 1l22 22" />
              </svg>
            </span>
          </button>
        )}
      </div>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  );
}


