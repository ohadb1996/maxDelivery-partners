import React from 'react';

interface AuthCardProps {
  children: React.ReactNode;
}

export function AuthCard({ children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md">
      <div 
        className="relative p-8 rounded-2xl border border-white/30 transition-all duration-500 hover:border-white/50 hover:shadow-2xl hover:shadow-blue-500/20 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/assets/logo.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black/60 rounded-2xl"></div>
        
        {/* Content */}
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
}
