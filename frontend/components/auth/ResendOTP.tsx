'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  const [justResent, setJustResent] = useState(false);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (cooldown === 0 && justResent) {
      // Reset the "just sent" state after cooldown
      setTimeout(() => setJustResent(false), 1000);
    }
  }, [cooldown, justResent]);

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;

    setIsResending(true);
    const success = await onResend();
    setIsResending(false);

    if (success) {
      setCooldown(cooldownSeconds);
      setJustResent(true);
    }
  };

  return (
    <div className="text-center space-y-2">
      {cooldown > 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-2"
        >
          <p className="text-sm text-gray-400">
            Didn't receive the code?
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180)' }}></div>
            <p className="text-sm text-gray-400">
              Resend OTP in <span className="font-semibold" style={{ color: 'oklch(0.7 0.15 180)' }}>{cooldown}s</span>
            </p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {justResent ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 text-sm"
              style={{ color: 'oklch(0.7 0.15 180)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">OTP sent successfully!</span>
            </motion.div>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Didn't receive the code?
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResend}
                isLoading={isResending}
                className="text-sm w-full sm:w-auto"
                style={{
                  borderColor: 'oklch(0.7 0.15 180 / 0.5)',
                  color: 'oklch(0.7 0.15 180)',
                }}
              >
                {isResending ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Resend OTP
                  </>
                )}
              </Button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

