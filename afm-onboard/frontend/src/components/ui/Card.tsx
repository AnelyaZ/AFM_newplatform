import React from 'react';

type CardProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> & {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export default function Card({ title, actions, children, className = '', onClick, ...rest }: CardProps) {
  const clickable = typeof onClick === 'function';
  const baseClasses = `glass rounded-xl border border-black/10 dark:border-white/10 ${
    clickable
      ? 'cursor-pointer transition-all duration-150 hover:bg-black/5 hover:shadow-md hover:-translate-y-0.5 hover:ring-1 hover:ring-sky-400/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:hover:bg-white/5'
      : ''
  } ${className}`;
  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      (onClick as any)?.(e as any);
    }
  };
  return (
    <div
      className={baseClasses}
      onClick={onClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-pressed={undefined}
      {...rest}
    >
      {(title || actions) && (
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 sm:px-5 sm:py-4 dark:border-white/10">
          <div className="min-w-0 flex-1 font-semibold text-gray-900 dark:text-white">{title}</div>
          {actions && <div className="ml-3 flex shrink-0 items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="px-4 py-4 sm:px-5 sm:py-5 flex-1 flex flex-col">{children}</div>
    </div>
  );
}


