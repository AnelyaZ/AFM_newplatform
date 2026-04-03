import React from 'react';

type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string | null;
};

export default function TextArea({ label, error, className = '', ...rest }: TextAreaProps) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</span>}
      <textarea
        className={`min-h-[96px] rounded-lg border px-3 py-2 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 ${
          error ? 'border-rose-500' : 'border-gray-300 dark:border-white/10'
        } bg-white dark:bg-white/5 ${className}`}
        {...rest}
      />
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  );
}


