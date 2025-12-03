'use client';

import React from 'react';

interface FilterInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  compact?: boolean;
}

export const FilterInput: React.FC<FilterInputProps> = ({
  label,
  compact = false,
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
      <input
        className={`
          ${compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-xs'}
          rounded-lg font-medium text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-offset-0
          transition-all duration-200
          ${className}
        `}
        style={{
          backgroundColor: props.value 
            ? 'oklch(0.15 0.05 180 / 0.6)' 
            : 'oklch(0.1 0 0 / 0.8)',
          borderColor: props.value 
            ? 'oklch(var(--p) / 0.6)' 
            : 'oklch(var(--nc) / 0.2)',
          borderWidth: '1.5px',
          borderStyle: 'solid',
          boxShadow: props.value 
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
          e.currentTarget.style.borderColor = e.currentTarget.value 
            ? 'oklch(var(--p) / 0.6)' 
            : 'oklch(var(--nc) / 0.2)';
          e.currentTarget.style.boxShadow = e.currentTarget.value 
            ? '0 2px 8px oklch(var(--p) / 0.15)' 
            : '0 1px 3px oklch(0 0 0 / 0.2)';
          e.currentTarget.style.backgroundColor = e.currentTarget.value 
            ? 'oklch(0.15 0.05 180 / 0.6)' 
            : 'oklch(0.1 0 0 / 0.8)';
        }}
        {...props}
      />
    </div>
  );
};

