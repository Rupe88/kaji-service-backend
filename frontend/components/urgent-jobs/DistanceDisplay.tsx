'use client';

import React from 'react';
import { formatDistance } from '@/utils/distance';

interface DistanceDisplayProps {
  distance: number; // in kilometers
  className?: string;
}

export const DistanceDisplay: React.FC<DistanceDisplayProps> = ({ distance, className = '' }) => {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <svg className="w-4 h-4" style={{ color: 'oklch(0.7 0.15 180)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
      <span className="text-sm" style={{ color: 'oklch(0.7 0.15 180)' }}>
        {formatDistance(distance)}
      </span>
    </div>
  );
};

