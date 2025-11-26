'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { applicationsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { JobApplicationWithJob } from '@/types/api';
import { ResumeViewer } from '@/components/resume/ResumeViewer';

interface ApplicationWithJob {
  id: string;
  jobId: string;
  applicantId: string;
  resumeUrl?: string;
  coverLetter?: string;
  portfolioUrl?: string;
  status: 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED';
  interviewDate?: string;
  interviewNotes?: string;
  appliedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  job?: {
    id: string;
    title: string;
    employer?: {
      companyName: string;
    };
  };
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: {
    bg: 'oklch(0.8 0.15 60 / 0.2)',
    text: 'oklch(0.8 0.15 60)',
    border: 'oklch(0.8 0.15 60 / 0.3)',
  },
  REVIEWED: {
    bg: 'oklch(0.7 0.15 180 / 0.2)',
    text: 'oklch(0.7 0.15 180)',
    border: 'oklch(0.7 0.15 180 / 0.3)',
  },
  SHORTLISTED: {
    bg: 'oklch(0.7 0.15 240 / 0.2)',
    text: 'oklch(0.7 0.15 240)',
    border: 'oklch(0.7 0.15 240 / 0.3)',
  },
  INTERVIEW: {
    bg: 'oklch(0.7 0.15 300 / 0.2)',
    text: 'oklch(0.7 0.15 300)',
    border: 'oklch(0.7 0.15 300 / 0.3)',
  },
  ACCEPTED: {
    bg: 'oklch(0.7 0.15 150 / 0.2)',
    text: 'oklch(0.7 0.15 150)',
    border: 'oklch(0.7 0.15 150 / 0.3)',
  },
  REJECTED: {
    bg: 'oklch(0.65 0.2 330 / 0.2)',
    text: 'oklch(0.65 0.2 330)',
    border: 'oklch(0.65 0.2 330 / 0.3)',
  },
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Review',
  REVIEWED: 'Under Review',
  SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview Scheduled',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
};

function ApplicationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [allApplications, setAllApplications] = useState<ApplicationWithJob[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || '');
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('search') || '');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });

  // Sync search query and status with URL params
  useEffect(() => {
    const searchParam = searchParams.get('search') || '';
    const statusParam = searchParams.get('status') || '';
    setSearchQuery(searchParam);
    if (statusParam !== selectedStatus) {
      setSelectedStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user?.id) {
      fetchApplications();
    }
  }, [user?.id]);

  // Filter applications based on search query and status
  const filteredApplications = useMemo(() => {
    let filtered = [...allApplications];

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(app => app.status === selectedStatus);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(app => {
        const jobTitle = app.job?.title?.toLowerCase() || '';
        const companyName = app.job?.employer?.companyName?.toLowerCase() || '';
        const status = app.status?.toLowerCase() || '';
        return jobTitle.includes(query) || companyName.includes(query) || status.includes(query);
      });
    }

    return filtered;
  }, [allApplications, selectedStatus, searchQuery]);

  // Calculate pagination
  const totalFiltered = filteredApplications.length;
  const totalPages = Math.ceil(totalFiltered / pagination.limit);
  const start = (pagination.page - 1) * pagination.limit;
  const end = start + pagination.limit;
  const applications = filteredApplications.slice(start, end);

  // Update pagination when filters change
  useEffect(() => {
    setPagination(prev => ({
      ...prev,
      total: totalFiltered,
      pages: totalPages,
      page: prev.page > totalPages ? 1 : prev.page, // Reset to page 1 if current page exceeds total
    }));
  }, [totalFiltered, totalPages]);

  const fetchApplications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response: any = await applicationsApi.getByUser(user.id);
      
      // Handle both array and paginated response
      if (Array.isArray(response)) {
        setAllApplications(response as ApplicationWithJob[]);
      } else if (response && response.data) {
        setAllApplications((response.data || []) as ApplicationWithJob[]);
      } else {
        setAllApplications([]);
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
      setAllApplications([]);
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

  const getStatusBadge = (status: string) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    const label = STATUS_LABELS[status] || status;

    return (
      <span
        className="px-3 py-1 rounded-lg text-xs font-semibold border"
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          borderColor: colors.border,
        }}
      >
        {label}
      </span>
    );
  };

  const statusOptions = [
    { value: '', label: 'All Status' },
    ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  ];

  if (loading && applications.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading applications...</div>
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
            <h1 className="text-4xl font-bold text-white mb-2">My Applications</h1>
            <p className="text-gray-400">
              Track the status of your job applications
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3 flex-wrap">
                <label className="text-sm text-gray-400 whitespace-nowrap">Filter by status:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    const newStatus = e.target.value;
                    setSelectedStatus(newStatus);
                    setPagination(prev => ({ ...prev, page: 1 }));
                    // Update URL params
                    const params = new URLSearchParams(searchParams.toString());
                    if (newStatus) {
                      params.set('status', newStatus);
                    } else {
                      params.delete('status');
                    }
                    router.push(`/dashboard/applications?${params.toString()}`);
                  }}
                  className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                  }}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {searchQuery && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-teal-500/20 border border-teal-500/30">
                    <span className="text-sm text-teal-400">Search: "{searchQuery}"</span>
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        const params = new URLSearchParams(searchParams.toString());
                        params.delete('search');
                        router.push(`/dashboard/applications?${params.toString()}`);
                      }}
                      className="text-teal-400 hover:text-teal-300"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-400">
                {totalFiltered > 0 && (
                  <span>
                    Showing {applications.length} of {totalFiltered} application{totalFiltered !== 1 ? 's' : ''}
                    {searchQuery && ` matching "${searchQuery}"`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Applications List */}
          {applications.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-2xl font-bold text-white mb-2">No applications found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || selectedStatus
                  ? 'No applications match your search or filter criteria'
                  : "You haven't applied to any jobs yet"}
              </p>
              {!searchQuery && !selectedStatus && (
                <Link href="/dashboard/jobs">
                  <Button variant="primary">Browse Jobs</Button>
                </Link>
              )}
              {(searchQuery || selectedStatus) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('');
                    setPagination(prev => ({ ...prev, page: 1 }));
                    router.push('/dashboard/applications');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <AnimatePresence>
                  {applications.map((application, index) => (
                    <motion.div
                      key={application.id}
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
                        {/* Application Info */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              {application.job ? (
                                <Link href={`/dashboard/jobs/${application.job.id}`}>
                                  <h3 className="text-xl font-bold text-white mb-1 hover:text-teal-400 transition-colors cursor-pointer">
                                    {application.job.title}
                                  </h3>
                                </Link>
                              ) : (
                                <h3 className="text-xl font-bold text-white mb-1">Job Application</h3>
                              )}
                              {application.job?.employer && (
                                <p className="text-lg text-gray-300 mb-2">
                                  {application.job.employer.companyName}
                                </p>
                              )}
                            </div>
                            {getStatusBadge(application.status)}
                          </div>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>Applied {formatDate(application.createdAt)}</span>
                            </div>
                            {application.interviewDate && (
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>Interview: {formatDate(application.interviewDate)}</span>
                              </div>
                            )}
                          </div>

                          {application.coverLetter && (
                            <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                              {application.coverLetter}
                            </p>
                          )}

                          {application.resumeUrl && (
                            <ResumeViewer
                              resumeUrl={application.resumeUrl}
                              jobTitle={application.job?.title}
                            />
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-3 lg:min-w-[140px]">
                          {application.job && (
                            <Link href={`/dashboard/jobs/${application.job.id}`}>
                              <Button variant="outline" size="sm" className="w-full">
                                View Job
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-gray-800/50">
                  <p className="text-gray-400 text-sm">
                    Page {pagination.page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = Math.max(1, pagination.page - 1);
                        setPagination(prev => ({ ...prev, page: newPage }));
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', newPage.toString());
                        router.push(`/dashboard/applications?${params.toString()}`);
                      }}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const newPage = Math.min(totalPages, pagination.page + 1);
                        setPagination(prev => ({ ...prev, page: newPage }));
                        const params = new URLSearchParams(searchParams.toString());
                        params.set('page', newPage.toString());
                        router.push(`/dashboard/applications?${params.toString()}`);
                      }}
                      disabled={pagination.page === totalPages}
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

export default function ApplicationsPage() {
  return (
    <ProtectedRoute>
      <ApplicationsContent />
    </ProtectedRoute>
  );
}

