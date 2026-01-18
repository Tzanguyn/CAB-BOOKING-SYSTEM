import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading, 
  className = '', 
  ...props 
}) => {
  const baseStyle = "w-full py-2 px-4 rounded font-bold transition duration-200 flex justify-center items-center cursor-pointer";
  const styles = {
    primary: "bg-sky-600 text-white hover:bg-blue-700 border border-transparent",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 bg-transparent"
  };

  return (
    <button 
      className={`${baseStyle} ${styles[variant]} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''} ${className}`}
      disabled={isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
      ) : null}
      {children}
    </button>
  );
};

export default Button;