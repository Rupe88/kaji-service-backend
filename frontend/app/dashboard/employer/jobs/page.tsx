'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { jobsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { JobPosting } from '@/types/api';

interface JobPostingWithDetails extends JobPosting {
  _count?: {
    applications: number;
  };
}

function MyJobsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPostingWithDetails[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });

  useEffect(() => {
    if (user?.id && user?.role === 'INDUSTRIAL') {
      fetchJobs();
    }
  }, [user?.id, pagination.page]);

  const fetchJobs = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await jobsApi.list({
        page: pagination.page,
        limit: pagination.limit,
        // Filter by employer - backend should handle this based on auth
      });

      // Filter jobs by current employer
      const employerJobs = (response.data || []).filter(
        (job: JobPostingWithDetails) => job.employerId === user.id
      ) as JobPostingWithDetails[];

      setJobs(employerJobs);
      setPagination(response.pagination || { page: 1, limit: 12, total: employerJobs.length, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatJobType = (jobType: string) => {
    return jobType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleDelete = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job posting?')) {
      return;
    }

    try {
      await jobsApi.delete(jobId);
      toast.success('Job deleted successfully');
      fetchJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete job');
    }
  };

  if (!user || user.role !== 'INDUSTRIAL') {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">This page is only available for employers</p>
            <Link href="/dashboard">
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading && jobs.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading jobs...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">My Job Postings</h1>
                <p className="text-gray-400">
                  Manage your job postings and view applications
                </p>
              </div>
              <Link href="/dashboard/employer/post-job">
                <Button variant="primary" size="md">
                  + Post New Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Jobs List */}
          {jobs.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3 className="text-2xl font-bold text-white mb-2">No jobs posted yet</h3>
              <p className="text-gray-400 mb-6">Start by posting your first job opening</p>
              <Link href="/dashboard/employer/post-job">
                <Button variant="primary">Post Your First Job</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <AnimatePresence>
                  {jobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 rounded-2xl border-2 backdrop-blur-xl hover:border-teal-500/50 transition-all"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                      }}
                    >
                      <div className="flex flex-col lg:flex-row gap-4">
                        {/* Job Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white mb-1">{job.title}</h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                                <span>{formatJobType(job.jobType)}</span>
                                {job.location && (
                                  <span>
                                    {[job.location.municipality, job.location.district, job.location.province]
                                      .filter(Boolean)
                                      .join(', ')}
                                  </span>
                                )}
                                {job.remoteWork && <span>Remote</span>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {job.verified && (
                                <span className="px-2 py-1 rounded bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-semibold">
                                  Verified
                                </span>
                              )}
                              {job.status === 'ACTIVE' ? (
                                <span className="px-2 py-1 rounded bg-teal-500/20 border border-teal-500/30 text-teal-400 text-xs font-semibold">
                                  Active
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded bg-gray-500/20 border border-gray-500/30 text-gray-400 text-xs font-semibold">
                                  {job.status}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                            {job.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {job._count && job._count.applications > 0 && (
                              <Link href={`/dashboard/employer/jobs/${job.id}/applications`}>
                                <span className="px-2 py-1 rounded bg-teal-500/20 text-teal-400 hover:bg-teal-500/30 transition-colors cursor-pointer">
                                  {job._count.applications} application{job._count.applications !== 1 ? 's' : ''}
                                </span>
                              </Link>
                            )}
                            <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-400">
                              Posted {formatDate(job.createdAt)}
                            </span>
                            {job.expiresAt && (
                              <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-400">
                                Expires {formatDate(job.expiresAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 lg:min-w-[140px]">
                          <Link href={`/dashboard/employer/jobs/${job.id}/applications`}>
                            <Button variant="primary" size="sm" className="w-full">
                              View Applications
                            </Button>
                          </Link>
                          <Link href={`/dashboard/jobs/${job.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              View Job
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-400 hover:text-red-300"
                            onClick={() => handleDelete(job.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-gray-800/50">
                  <p className="text-gray-400 text-sm">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPagination(prev => ({ ...prev, page: Math.min(prev.pages, prev.page + 1) }))}
                      disabled={pagination.page === pagination.pages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function MyJobsPage() {
  return (
    <ProtectedRoute>
      <MyJobsContent />
    </ProtectedRoute>
  );
}

