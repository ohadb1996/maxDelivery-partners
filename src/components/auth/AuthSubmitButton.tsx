import React, { useCallback } from 'react';

interface AuthSubmitButtonProps {
  children: React.ReactNode;
  isLoading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function AuthSubmitButton({ 
  children, 
  isLoading = false, 
  loading,
  type = 'submit',
  disabled,
  onClick,
  ...props 
}: AuthSubmitButtonProps) {
  const isDisabled = disabled || isLoading || loading;
  
  const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    
    if (onClick) {
      onClick(e);
    }
  }, [isDisabled, onClick]);
  
  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={handleClick}
      className="relative w-full py-3 bg-gradient-to-r from-black to-green-800 rounded-xl font-medium transition-all duration-500 text-white overflow-hidden group hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
      {...props}
    >
      {/* Hover gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-green-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Shimmer effect */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100">
        <div className="absolute inset-0 translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      </div>
      
      {/* Button content */}
      <div className="relative z-10 flex items-center justify-center gap-2">
        {isDisabled ? (
          <>
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </>
        ) : (
          <span>{children}</span>
        )}
      </div>
    </button>
  );
}
