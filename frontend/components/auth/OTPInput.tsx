'use client';

import React, { useRef, useState, KeyboardEvent, ChangeEvent } from 'react';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  error?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  error,
}) => {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if OTP is complete
    if (newOtp.every((digit) => digit !== '') && newOtp.join('').length === length) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    const pastedDigits = pastedData.split('').filter((char) => /^\d$/.test(char));

    if (pastedDigits.length === length) {
      const newOtp = [...pastedDigits];
      setOtp(newOtp);
      onComplete(newOtp.join(''));
      inputRefs.current[length - 1]?.focus();
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-3 justify-center">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange(index, e.target.value)}
            onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            className="w-12 h-14 text-center text-2xl font-bold rounded-lg text-white focus:outline-none focus:ring-2 transition-all duration-200"
            style={{
              backgroundColor: 'var(--card-bg)',
              borderWidth: '2px',
              borderStyle: 'solid',
              borderColor: error ? '#ec4899' : 'var(--border)',
            } as React.CSSProperties & { '--tw-ring-color'?: string }}
            data-ring-color={error ? '#ec4899' : '#14b8a6'}
          />
        ))}
      </div>
    </div>
  );
};

