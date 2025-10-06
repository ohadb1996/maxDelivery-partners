import React from 'react';
import { Link } from 'react-router-dom';

interface AuthLinkProps {
  to: string;
  children: React.ReactNode;
}

export function AuthLink({ to, children }: AuthLinkProps) {
  return (
    <div className="mt-6 text-center">
      <Link 
        to={to}
        className="relative text-gray-400 hover:text-white transition-all duration-300 group"
      >
        {/* Hover underline effect */}
        <span className="relative">
          {children}
          <span className="absolute bottom-0 left-0 w-0 h-px bg-gradient-to-r from-blue-400 to-purple-400 group-hover:w-full transition-all duration-300"></span>
        </span>
      </Link>
    </div>
  );
}
