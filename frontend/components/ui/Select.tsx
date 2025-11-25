'use client';

import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  className = '',
  options,
  placeholder = 'Select an option',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      <select
        className={`
          w-full px-3 sm:px-4 py-3 sm:py-3.5 
          rounded-xl text-sm sm:text-base
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:border-transparent
          transition-all duration-300
          backdrop-blur-sm border-2
          appearance-none cursor-pointer
          bg-no-repeat bg-right bg-[length:1.5em_1.5em]
          pr-10
          ${className}
        `}
        style={{
          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
          borderColor: error 
            ? 'oklch(0.65 0.2 330)' 
            : 'oklch(0.7 0.15 180 / 0.2)',
          borderWidth: '2px',
          borderStyle: 'solid',
          boxShadow: error 
            ? '0 0 0 3px oklch(0.65 0.2 330 / 0.1)' 
            : '0 0 0 1px oklch(0.17 0 0 / 0.3)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23ffffff' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
          ...(error ? { '--tw-ring-color': 'oklch(0.65 0.2 330)' } : { '--tw-ring-color': 'oklch(0.7 0.15 180)' }),
        }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = 'oklch(0.7 0.15 180 / 0.5)';
            e.currentTarget.style.boxShadow = '0 0 0 3px oklch(0.7 0.15 180 / 0.1)';
          }
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = 'oklch(0.7 0.15 180 / 0.2)';
            e.currentTarget.style.boxShadow = '0 0 0 1px oklch(0.17 0 0 / 0.3)';
          }
          props.onBlur?.(e);
        }}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value} style={{ backgroundColor: '#1a1a1a', color: '#ffffff' }}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-2 text-sm flex items-center gap-1.5"
          style={{ color: 'oklch(0.65 0.2 330)' }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-sm text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

