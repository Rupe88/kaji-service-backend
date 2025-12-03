'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { urgentJobsApi } from '@/lib/api-client';
import { UrgentJobCard } from './UrgentJobCard';
import Link from 'next/link';

interface UrgentJobsWidgetProps {
  limit?: number;
  showViewAll?: boolean;
}

export function UrgentJobsWidget({ limit = 3, showViewAll = true }: UrgentJobsWidgetProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUrgentJobs = async () => {
      try {
        setLoading(true);
        const response = await urgentJobsApi.list({
          page: 1,
          limit: limit,
          status: 'OPEN',
          sortBy: 'newest',
        });

        if (response.data && Array.isArray(response.data)) {
          // Sort by verified first
          const sortedJobs = [...response.data].sort((a: any, b: any) => {
            const aVerified = a.isVerified || false;
            const bVerified = b.isVerified || false;
            if (aVerified && !bVerified) return -1;
            if (!aVerified && bVerified) return 1;
            return 0;
          });

          setJobs(sortedJobs.slice(0, limit));
        }
      } catch (error) {
        console.error('Error fetching urgent jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUrgentJobs();
  }, [limit]);

  if (loading) {
    return (
      <div className="rounded-2xl border-2 backdrop-blur-xl p-6" style={{
        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
      }}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oklch(var(--p))"></div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border-2 backdrop-blur-xl p-6"
      style={{
        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1">Urgent Jobs</h2>
          <p className="text-sm text-gray-400">Quick work opportunities near you</p>
        </div>
        {showViewAll && (
          <Link
            href="/dashboard/urgent-jobs"
            className="text-sm font-semibold text-oklch(var(--p)) hover:underline"
          >
            View All →
          </Link>
        )}
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <UrgentJobCard
            key={job.id}
            job={job}
            showVerifiedBadge={true}
          />
        ))}
      </div>

      {showViewAll && (
        <div className="mt-6 pt-6 border-t border-oklch(var(--nc) / 0.1)">
          <Link
            href="/dashboard/urgent-jobs/post"
            className="block w-full text-center py-3 px-4 rounded-xl font-semibold transition-colors"
            style={{
              backgroundColor: 'oklch(var(--p) / 0.1)',
              color: 'oklch(var(--p))',
            }}
          >
            Post Urgent Job
          </Link>
        </div>
      )}
    </motion.div>
  );
}

