import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  fullWidth?: boolean;
}
// kkk

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  disabled,
  ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]";
  
  const variants = {
    primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-200 focus:ring-primary-500",
    secondary: "bg-stone-800 hover:bg-stone-900 text-white shadow-lg shadow-stone-200 focus:ring-stone-600",
    outline: "border-2 border-stone-200 hover:border-primary-500 hover:text-primary-600 text-stone-600 bg-transparent",
    ghost: "bg-transparent text-stone-500 hover:text-primary-600 hover:bg-primary-50",
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
