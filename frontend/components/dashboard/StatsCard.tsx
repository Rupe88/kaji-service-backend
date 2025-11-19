'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  change?: {
    value: number;
    isPositive: boolean;
  };
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  gradient,
  change,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative p-6 rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
      style={{
        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}
    >
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 ${gradient}`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 rounded-xl bg-gradient-to-br from-teal-500/20 to-purple-500/20">
            {icon}
          </div>
          {change && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${change.isPositive ? 'text-teal-400' : 'text-red-400'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={change.isPositive ? "M13 7l5 5m0 0l-5 5m5-5H6" : "M13 17l5-5m0 0l-5-5m5 5H6"} />
              </svg>
              {Math.abs(change.value)}%
            </div>
          )}
        </div>
        <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
};

