import React from 'react';

type Option = { value: string; label: string };
type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string | null;
  options: Option[];
};

export default function Select({ label, error, options, className = '', ...rest }: SelectProps) {
  return (
    <label className="flex flex-col gap-1">
      {label && <span className="text-sm font-medium text-gray-800 dark:text-white/90">{label}</span>}
      <select
        className={`rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 ${
          error ? 'border-rose-500' : 'border-gray-300 dark:border-white/10'
        } bg-white text-gray-900 dark:bg-white/5 dark:text-white ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-white text-gray-900 dark:bg-[#0e1628] dark:text-white">
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-rose-400">{error}</span>}
    </label>
  );
}


