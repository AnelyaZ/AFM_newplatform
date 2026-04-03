
interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12', 
    lg: 'h-16 w-16',
    xl: 'h-20 w-20'
  };

  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} flex-shrink-0`}>
        <img 
          src="/logo.png" 
          alt="QARJILYQ MONITORING AGENTTIGI" 
          className="h-full w-full object-contain"
        />
      </div>
      {showText && (
        <div className="flex flex-col">
          <div className={`font-bold tracking-wide text-gray-900 dark:text-white ${textSizes[size]}`}>
            QARJILYQ MONITORING
          </div>
          <div className={`font-bold tracking-wide text-gray-900 dark:text-white ${textSizes[size]}`}>
            AGENTTIGI
          </div>
        </div>
      )}
    </div>
  );
}

