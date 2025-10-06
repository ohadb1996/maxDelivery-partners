import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface AuthInputProps {
  type: 'text' | 'email' | 'tel' | 'password';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  icon: React.ReactNode;
  label: string;
  error?: string;
  dir?: 'rtl' | 'ltr';
}

export function AuthInput({
  type,
  value,
  onChange,
  placeholder,
  icon,
  label,
  error,
  dir = 'rtl'
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div>
      <label className="block text-sm mb-2">{label}</label>
      <div className="relative">
        <input
          type={type === 'password' ? (showPassword ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          className={`
            w-full px-4 py-3 bg-white/5 border rounded-xl focus:ring-2 transition-all text-white
            ${error 
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-white/10 focus:border-blue-500 focus:ring-blue-500/20'
            }
            ${type === 'password' ? 'pl-20' : 'pl-10'}
          `}
          placeholder={placeholder}
          dir={dir}
        />
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-10 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
