import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<string, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover border border-transparent shadow-sm',
  secondary:
    'bg-secondary text-white hover:bg-secondary-hover border border-transparent shadow-sm',
  outline:
    'border-2 border-primary text-primary hover:bg-primary/10 bg-transparent',
  ghost:
    'text-text-secondary hover:text-text-primary hover:bg-surface-light bg-transparent border border-transparent',
  danger:
    'bg-danger text-white hover:bg-danger-hover border border-transparent shadow-sm',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-lg gap-2',
  lg: 'px-6 py-3 text-base rounded-lg gap-2.5',
};

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      className={`
        inline-flex items-center justify-center font-semibold
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-bg
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer active:scale-[0.97]'}
        ${className}
      `.trim()}
      disabled={isDisabled}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon ? (
        <span className="flex-shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {rightIcon && !isLoading && (
        <span className="flex-shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;
