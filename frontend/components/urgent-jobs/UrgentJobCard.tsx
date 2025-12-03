'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { DistanceDisplay } from './DistanceDisplay';

interface UrgentJobCardProps {
  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    province: string;
    district: string;
    city: string;
    ward?: string;
    paymentAmount: number;
    paymentType: string;
    urgencyLevel: string;
    status: string;
    maxWorkers: number;
    currentWorkers: number;
    startTime: string;
    imageUrl?: string;
    poster?: {
      id: string;
      firstName?: string;
      lastName?: string;
      profileImage?: string;
      individualKYC?: { status: string } | null;
      industrialKYC?: { status: string } | null;
    };
    distance?: number;
    isVerified?: boolean;
  };
  userLocation?: { latitude: number; longitude: number } | null;
  onClick?: () => void;
  showVerifiedBadge?: boolean;
}

const getUrgencyColor = (urgency: string): string => {
  switch (urgency) {
    case 'IMMEDIATE':
      return 'oklch(0.6 0.2 25)'; // Red
    case 'TODAY':
      return 'oklch(0.65 0.15 60)'; // Orange
    case 'WITHIN_HOURS':
      return 'oklch(0.7 0.15 90)'; // Yellow
    default:
      return 'oklch(0.7 0.15 180)'; // Teal
  }
};

const getUrgencyLabel = (urgency: string): string => {
  switch (urgency) {
    case 'IMMEDIATE':
      return '⚡ Immediate';
    case 'TODAY':
      return '📅 Today';
    case 'WITHIN_HOURS':
      return '⏰ Within Hours';
    default:
      return urgency;
  }
};

const getCategoryLabel = (category: string): string => {
  switch (category) {
    case 'HAND_TO_HAND':
      return 'Hand to Hand';
    case 'CASH_TO_CASH':
      return 'Cash to Cash';
    case 'LABOR':
      return 'Labor Work';
    case 'OTHER':
      return 'Other';
    default:
      return category;
  }
};

export function UrgentJobCard({ job, userLocation, onClick, showVerifiedBadge = true }: UrgentJobCardProps) {
  const router = useRouter();
  
  // Determine if verified (from API or calculate from KYC)
  const isVerified = job.isVerified !== undefined 
    ? job.isVerified 
    : (job.poster?.individualKYC?.status === 'APPROVED' || job.poster?.industrialKYC?.status === 'APPROVED');

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push(`/dashboard/urgent-jobs/${job.id}`);
    }
  };

  const posterName = job.poster
    ? `${job.poster.firstName || ''} ${job.poster.lastName || ''}`.trim() || 'Anonymous'
    : 'Anonymous';

  const startDate = new Date(job.startTime).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 backdrop-blur-xl p-6 cursor-pointer hover:scale-[1.02] transition-all duration-300 group"
      style={{
        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
        borderColor: isVerified 
          ? 'oklch(0.7 0.15 180 / 0.4)' 
          : 'oklch(0.7 0.15 180 / 0.2)',
      }}
      onClick={handleClick}
    >
      {/* Header with badges */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: `${getUrgencyColor(job.urgencyLevel)} / 0.2`,
              color: getUrgencyColor(job.urgencyLevel),
            }}
          >
            {getUrgencyLabel(job.urgencyLevel)}
          </span>
          {showVerifiedBadge && isVerified && (
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
              style={{
                backgroundColor: 'oklch(0.7 0.15 180 / 0.2)',
                color: 'oklch(0.7 0.15 180)',
              }}
            >
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Verified
            </span>
          )}
        </div>
        {job.distance !== undefined && userLocation && (
          <DistanceDisplay distance={job.distance} />
        )}
      </div>

      {/* Job Image */}
      {job.imageUrl && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <img
            src={job.imageUrl}
            alt={job.title}
            className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      {/* Title */}
      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-oklch(var(--p)) transition-colors">
        {job.title}
      </h3>

      {/* Category and Location */}
      <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
        <span>{getCategoryLabel(job.category)}</span>
        <span>•</span>
        <span className="line-clamp-1">{job.city}, {job.district}</span>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-300 mb-4 line-clamp-2">{job.description}</p>

      {/* Payment and Workers */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Payment</p>
          <p className="text-lg font-bold" style={{ color: 'oklch(0.7 0.15 180)' }}>
            Rs. {job.paymentAmount.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">{job.paymentType}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 mb-1">Workers</p>
          <p className="text-white font-semibold">
            {job.currentWorkers}/{job.maxWorkers}
          </p>
        </div>
      </div>

      {/* Start Time and Poster */}
      <div className="flex items-center justify-between pt-4 border-t border-oklch(var(--nc) / 0.1)">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-xs text-gray-400">{startDate}</span>
        </div>
        <div className="flex items-center gap-2">
          {job.poster?.profileImage ? (
            <img
              src={job.poster.profileImage}
              alt={posterName}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <div className="w-6 h-6 rounded-full bg-oklch(var(--p) / 0.2) flex items-center justify-center">
              <span className="text-xs text-oklch(var(--p))">
                {posterName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-xs text-gray-400">{posterName}</span>
        </div>
      </div>
    </motion.div>
  );
}

