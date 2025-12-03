'use client';

import React from 'react';

interface FilterSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  hasValue?: boolean;
}

export const FilterSelect: React.FC<FilterSelectProps> = ({
  label,
  options,
  hasValue,
  className = '',
  ...props
}) => {
  return (
    <div className="flex items-center gap-2">
      {label && (
        <label className="text-xs font-medium text-gray-400 whitespace-nowrap">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          className={`
            px-3 py-2 rounded-lg text-xs font-medium text-white
            focus:outline-none focus:ring-2 focus:ring-offset-0
            transition-all duration-200 cursor-pointer
            appearance-none pr-8
            ${className}
          `}
          style={{
            backgroundColor: hasValue 
              ? 'oklch(0.15 0.05 180 / 0.6)' 
              : 'oklch(0.1 0 0 / 0.8)',
            borderColor: hasValue 
              ? 'oklch(var(--p) / 0.6)' 
              : 'oklch(var(--nc) / 0.2)',
            borderWidth: '1.5px',
            borderStyle: 'solid',
            boxShadow: hasValue 
              ? '0 2px 8px oklch(var(--p) / 0.15)' 
              : '0 1px 3px oklch(0 0 0 / 0.2)',
            '--tw-ring-color': 'oklch(var(--p))',
          } as React.CSSProperties}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'oklch(var(--p) / 0.8)';
            e.currentTarget.style.boxShadow = '0 0 0 3px oklch(var(--p) / 0.15), 0 2px 8px oklch(var(--p) / 0.2)';
            e.currentTarget.style.backgroundColor = 'oklch(0.15 0.05 180 / 0.7)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = hasValue 
              ? 'oklch(var(--p) / 0.6)' 
              : 'oklch(var(--nc) / 0.2)';
            e.currentTarget.style.boxShadow = hasValue 
              ? '0 2px 8px oklch(var(--p) / 0.15)' 
              : '0 1px 3px oklch(0 0 0 / 0.2)';
            e.currentTarget.style.backgroundColor = hasValue 
              ? 'oklch(0.15 0.05 180 / 0.6)' 
              : 'oklch(0.1 0 0 / 0.8)';
          }}
          {...props}
        >
          {options.map((option) => (
            <option 
              key={option.value} 
              value={option.value}
              style={{ 
                backgroundColor: '#1a1a1a', 
                color: '#ffffff' 
              }}
            >
              {option.label}
            </option>
          ))}
        </select>
        <div 
          className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'oklch(var(--nc) / 0.6)' }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

