'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

interface KYCAlertProps {
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | null;
}

export const KYCAlert: React.FC<KYCAlertProps> = ({ kycStatus }) => {
  const { user } = useAuth();

  // Don't show alert if KYC is approved
  if (kycStatus === 'APPROVED') {
    return null;
  }

  const kycUrl = user?.role === 'INDIVIDUAL' ? '/kyc/individual' : '/kyc/industrial';
  const isRejected = kycStatus === 'REJECTED';

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-6 mt-4 mb-6 p-4 rounded-xl border-2 backdrop-blur-xl"
      style={{
        backgroundColor: isRejected 
          ? 'oklch(0.15 0.1 330 / 0.8)' 
          : 'oklch(0.15 0.1 60 / 0.8)',
        borderColor: isRejected
          ? 'oklch(0.65 0.2 330 / 0.5)'
          : 'oklch(0.8 0.15 60 / 0.5)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            isRejected 
              ? 'bg-red-500/20' 
              : 'bg-yellow-500/20'
          }`}>
            {isRejected ? (
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base mb-1">
              {isRejected ? 'KYC Verification Rejected' : 'KYC Verification Required'}
            </h3>
            <p className="text-gray-300 text-sm">
              {isRejected 
                ? 'Your KYC verification was rejected. Please resubmit to access all features.'
                : 'Complete your KYC verification to unlock all features and apply for jobs.'}
            </p>
          </div>
        </div>
        <Link href={kycUrl}>
          <Button
            variant="primary"
            size="sm"
            className="flex-shrink-0"
          >
            {isRejected ? 'Resubmit KYC' : 'Complete KYC'}
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};

