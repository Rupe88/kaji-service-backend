'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { adminApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface UnverifiedJob {
  id: string;
  title: string;
  description: string;
  jobType: string;
  province: string;
  district: string;
  city: string;
  isRemote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryType: string | null;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  employer: {
    companyName: string;
    industrySector: string | null;
    province: string | null;
    district: string | null;
    status: string;
  };
  _count: {
    applications: number;
  };
}

function JobVerificationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<UnverifiedJob[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'unverified' | 'verified' | 'all'>('unverified');
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchJobs();
    }
  }, [user?.role, selectedStatus, pagination.page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const response = await adminApi.getUnverifiedJobs(params);
      setJobs(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (jobId: string, verify: boolean) => {
    try {
      setUpdating(true);
      await adminApi.updateJobVerification(jobId, { isVerified: verify });
      toast.success(verify ? 'Job verified successfully!' : 'Job verification removed');
      fetchJobs();
      setSelectedJobs(new Set());
    } catch (error: any) {
      console.error('Error updating job verification:', error);
      toast.error(error.response?.data?.message || 'Failed to update job verification');
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkVerify = async (verify: boolean) => {
    if (selectedJobs.size === 0) {
      toast.error('Please select at least one job');
      return;
    }

    try {
      setUpdating(true);
      await adminApi.bulkUpdateJobVerification({
        jobIds: Array.from(selectedJobs),
        isVerified: verify,
      });
      toast.success(`${selectedJobs.size} job(s) ${verify ? 'verified' : 'unverified'} successfully!`);
      fetchJobs();
      setSelectedJobs(new Set());
    } catch (error: any) {
      console.error('Error bulk updating job verification:', error);
      toast.error(error.response?.data?.message || 'Failed to bulk update job verification');
    } finally {
      setUpdating(false);
    }
  };

  const toggleJobSelection = (jobId: string) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const toggleAllSelection = () => {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(job => job.id)));
    }
  };

  const formatSalary = (job: UnverifiedJob) => {
    if (!job.salaryMin && !job.salaryMax) return 'Not specified';
    const min = job.salaryMin ? `Rs. ${job.salaryMin.toLocaleString()}` : '';
    const max = job.salaryMax ? `Rs. ${job.salaryMax.toLocaleString()}` : '';
    const type = job.salaryType ? `/${job.salaryType.toLowerCase()}` : '';
    if (min && max) return `${min} - ${max}${type}`;
    return min || max + type;
  };

  const formatJobType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
          <div className="text-white text-lg">Loading jobs...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Job Verification</h1>
          <p className="text-gray-400">Review and verify job postings</p>
        </div>
        {selectedJobs.size > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulkVerify(true)}
              disabled={updating}
              className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 font-semibold transition-colors disabled:opacity-50"
            >
              {updating ? 'Verifying...' : `Verify ${selectedJobs.size} Job(s)`}
            </button>
            <button
              onClick={() => handleBulkVerify(false)}
              disabled={updating}
              className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-colors disabled:opacity-50"
            >
              {updating ? 'Removing...' : `Remove Verification`}
            </button>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex gap-2 border-b border-gray-800/50">
        {(['unverified', 'verified', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => {
              setSelectedStatus(status);
              setPagination({ ...pagination, page: 1 });
            }}
            className={`px-4 py-2 font-semibold transition-colors border-b-2 ${
              selectedStatus === status
                ? 'border-teal-400 text-teal-400'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status === 'unverified' && jobs.filter(j => !j.isVerified).length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">
                {jobs.filter(j => !j.isVerified).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">No {selectedStatus === 'all' ? '' : selectedStatus} jobs found</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center gap-4">
            <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedJobs.size === jobs.length && jobs.length > 0}
                onChange={toggleAllSelection}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-teal-400 focus:ring-teal-400"
              />
              <span>Select All ({selectedJobs.size} selected)</span>
            </label>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {jobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: job.isVerified
                      ? 'oklch(0.7 0.15 120 / 0.3)'
                      : 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedJobs.has(job.id)}
                      onChange={() => toggleJobSelection(job.id)}
                      className="mt-1 w-4 h-4 rounded border-gray-600 bg-gray-800 text-teal-400 focus:ring-teal-400"
                    />
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1 hover:text-teal-400 transition-colors cursor-pointer"
                            onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                          >
                            {job.title}
                          </h3>
                          <p className="text-lg text-gray-300 mb-2">{job.employer.companyName}</p>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-3">
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {job.city || job.district}, {job.province}
                              {job.isRemote && ' • Remote'}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatSalary(job)}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {formatJobType(job.jobType)}
                            </span>
                            <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-400">
                              {job._count.applications} application{job._count.applications !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                            {job.description.replace(/<[^>]*>/g, '').substring(0, 200)}...
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {job.isVerified ? (
                            <span className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                              <span className="text-green-400 text-xs font-semibold">✓ Verified</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                              <span className="text-yellow-400 text-xs font-semibold">Pending</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <button
                          onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                          className="px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-semibold transition-colors text-sm"
                        >
                          View Details
                        </button>
                        {job.isVerified ? (
                          <button
                            onClick={() => handleVerify(job.id, false)}
                            disabled={updating}
                            className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-colors disabled:opacity-50 text-sm"
                          >
                            Remove Verification
                          </button>
                        ) : (
                          <button
                            onClick={() => handleVerify(job.id, true)}
                            disabled={updating}
                            className="px-4 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 font-semibold transition-colors disabled:opacity-50 text-sm"
                          >
                            Verify Job
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 text-gray-300 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function JobVerificationPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <DashboardLayout>
        <JobVerificationContent />
      </DashboardLayout>
    </ProtectedRoute>
  );
}

