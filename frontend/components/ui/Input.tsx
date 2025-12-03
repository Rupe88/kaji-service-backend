import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-white mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full px-3 sm:px-4 py-3 sm:py-3.5 
          rounded-xl text-sm sm:text-base font-medium
          text-white placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-offset-0 focus:border-transparent
          transition-all duration-200
          backdrop-blur-sm
          ${className}
        `}
        style={{
          backgroundColor: props.value 
            ? 'oklch(0.12 0 0 / 0.85)' 
            : 'oklch(0.1 0 0 / 0.8)',
          borderColor: error 
            ? 'oklch(0.65 0.2 330)' 
            : props.value
            ? 'oklch(0.7 0.15 180 / 0.3)'
            : 'oklch(0.7 0.15 180 / 0.2)',
          borderWidth: '1.5px',
          borderStyle: 'solid',
          boxShadow: error 
            ? '0 0 0 3px oklch(0.65 0.2 330 / 0.15), 0 2px 8px oklch(0.65 0.2 330 / 0.2)' 
            : props.value
            ? '0 2px 8px oklch(0.7 0.15 180 / 0.15), 0 1px 3px oklch(0 0 0 / 0.2)'
            : '0 1px 3px oklch(0 0 0 / 0.2)',
          ...(error ? { '--tw-ring-color': 'oklch(0.65 0.2 330)' } : { '--tw-ring-color': 'oklch(0.7 0.15 180)' }),
        }}
        onFocus={(e) => {
          if (!error) {
            e.currentTarget.style.borderColor = 'oklch(0.7 0.15 180 / 0.6)';
            e.currentTarget.style.boxShadow = '0 0 0 3px oklch(0.7 0.15 180 / 0.15), 0 4px 12px oklch(0.7 0.15 180 / 0.2)';
            e.currentTarget.style.backgroundColor = 'oklch(0.12 0 0 / 0.9)';
          }
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          if (!error) {
            const hasValue = e.currentTarget.value.length > 0;
            e.currentTarget.style.borderColor = hasValue
              ? 'oklch(0.7 0.15 180 / 0.3)'
              : 'oklch(0.7 0.15 180 / 0.2)';
            e.currentTarget.style.boxShadow = hasValue
              ? '0 2px 8px oklch(0.7 0.15 180 / 0.15), 0 1px 3px oklch(0 0 0 / 0.2)'
              : '0 1px 3px oklch(0 0 0 / 0.2)';
            e.currentTarget.style.backgroundColor = hasValue
              ? 'oklch(0.12 0 0 / 0.85)'
              : 'oklch(0.1 0 0 / 0.8)';
          }
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <p className="mt-2 text-sm flex items-center gap-1.5" style={{ color: 'oklch(0.65 0.2 330)' }}>
          <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      {helperText && !error && (
        <p className="mt-2 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

