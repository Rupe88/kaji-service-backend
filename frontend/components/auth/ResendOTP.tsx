'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';

interface ResendOTPProps {
  onResend: () => Promise<boolean>;
  cooldownSeconds?: number;
}

export const ResendOTP: React.FC<ResendOTPProps> = ({
  onResend,
  cooldownSeconds = 60,
}) => {
  const [cooldown, setCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    const success = await onResend();
    setIsResending(false);

    if (success) {
      setCooldown(cooldownSeconds);
    }
  };

  return (
    <div className="text-center">
      {cooldown > 0 ? (
        <p className="text-sm text-gray-400">
          Resend OTP in <span className="font-semibold" style={{ color: '#14b8a6' }}>{cooldown}s</span>
        </p>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResend}
          isLoading={isResending}
          className="text-sm"
        >
          Resend OTP
        </Button>
      )}
    </div>
  );
};

