import React from 'react';

export interface LoadingSpinnerProps {
  variant?: 'spinner' | 'dots' | 'pulse';
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
}

const sizeMap = {
  sm: { spinner: 'w-5 h-5', dot: 'w-1.5 h-1.5', pulse: 'w-6 h-6' },
  md: { spinner: 'w-8 h-8', dot: 'w-2.5 h-2.5', pulse: 'w-10 h-10' },
  lg: { spinner: 'w-12 h-12', dot: 'w-3 h-3', pulse: 'w-14 h-14' },
};

const Spinner: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <div
    className={`${sizeMap[size].spinner} border-2 border-surface-lighter border-t-primary rounded-full animate-spin`}
  />
);

const Dots: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <div className="flex items-center gap-1.5">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className={`${sizeMap[size].dot} bg-primary rounded-full animate-bounce`}
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

const Pulse: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => (
  <div className={`${sizeMap[size].pulse} bg-primary/30 rounded-full animate-ping`} />
);

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  variant = 'spinner',
  size = 'md',
  fullScreen = false,
  text,
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      {variant === 'spinner' && <Spinner size={size} />}
      {variant === 'dots' && <Dots size={size} />}
      {variant === 'pulse' && <Pulse size={size} />}
      {text && (
        <p className="text-sm text-text-secondary animate-pulse">{text}</p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
