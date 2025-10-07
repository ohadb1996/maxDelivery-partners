import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Logo Image */}
      <div className={`${sizeClasses[size]} rounded-2xl overflow-hidden shadow-lg`}>
        <img 
          src="/assets/logo.jpg" 
          alt="MaxDelivery Logo" 
          className="w-full h-full object-cover rounded-2xl"
        />
      </div>
      
      {/* Logo Text */}
      {showText && (
        <div className="text-left">
          <h1 className={`${textSizeClasses[size]} font-bold text-gray-900`}>
            MaxDelivery
          </h1>
          <p className="text-xs text-gray-500">Partner App</p>
        </div>
      )}
    </div>
  );
}
