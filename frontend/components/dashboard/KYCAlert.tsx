'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';

interface KYCAlertProps {
  kycStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | null;
  submittedAt?: string;
}

export const KYCAlert: React.FC<KYCAlertProps> = ({ kycStatus, submittedAt }) => {
  const { user } = useAuth();

  // Don't show alert if KYC is approved
  if (kycStatus === 'APPROVED') {
    return null;
  }

  const kycUrl = user?.role === 'INDIVIDUAL' ? '/kyc/individual' : '/kyc/industrial';
  const isRejected = kycStatus === 'REJECTED';
  // PENDING or RESUBMITTED means KYC is submitted but awaiting admin approval
  const isPending = kycStatus === 'PENDING' || kycStatus === 'RESUBMITTED';
  const isNotSubmitted = kycStatus === null;
  
  // Debug log (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('KYCAlert - Status:', kycStatus, 'isPending:', isPending, 'submittedAt:', submittedAt);
  }

  // Format submission date if available
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  // Don't show for ADMIN users
  if (user?.role === 'ADMIN') {
    return null;
  }

  // Determine KYC type based on user role
  const kycType = user?.role === 'INDUSTRIAL' ? 'Industrial' : 'Individual';
  const kycTypeLower = kycType.toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="mx-6 mt-4 mb-6 p-5 rounded-xl border-2 backdrop-blur-xl shadow-lg"
      style={{
        backgroundColor: isRejected 
          ? 'oklch(0.15 0.1 330 / 0.9)' 
          : isPending
          ? 'oklch(0.15 0.1 200 / 0.9)' // Blue for pending
          : 'oklch(0.15 0.1 60 / 0.9)', // Yellow for not submitted
        borderColor: isRejected
          ? 'oklch(0.65 0.2 330 / 0.6)'
          : isPending
          ? 'oklch(0.6 0.15 200 / 0.6)' // Blue border for pending
          : 'oklch(0.8 0.15 60 / 0.6)', // Yellow border for not submitted
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
            isRejected 
              ? 'bg-red-500/20' 
              : isPending
              ? 'bg-blue-500/20'
              : 'bg-yellow-500/20'
          }`}>
            {isRejected ? (
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : isPending ? (
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-lg mb-1.5">
              {isRejected 
                ? `${kycType} KYC Verification Rejected` 
                : isPending
                ? `${kycType} KYC Verification Pending Review`
                : `${kycType} KYC Verification Required`}
            </h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              {isRejected 
                ? `Your ${kycTypeLower} KYC verification was rejected. Please review the feedback and resubmit your ${kycTypeLower} KYC to access all platform features.`
                : isPending
                ? `Your ${kycTypeLower} KYC application is currently under review by our admin team. ${submittedAt ? `Submitted on ${formatDate(submittedAt)}. ` : ''}You will receive a notification once the review is complete.`
                : `Complete your ${kycTypeLower} KYC verification to unlock all platform features${user?.role === 'INDIVIDUAL' ? ', apply for jobs, and access exclusive opportunities' : ' and post job listings'}.`}
            </p>
          </div>
        </div>
        {!isPending && (
          <Link href={kycUrl}>
            <Button
              variant="primary"
              size="md"
              className="flex-shrink-0 font-semibold"
            >
              {isRejected ? (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resubmit KYC
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Complete KYC
                </>
              )}
            </Button>
          </Link>
        )}
        {isPending && (
          <div className="flex-shrink-0 px-5 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-blue-400 text-sm font-semibold">Pending Review</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

