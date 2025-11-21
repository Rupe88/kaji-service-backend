'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { jobsApi, applicationsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { JobApplication } from '@/types/api';
import { ResumeViewer } from '@/components/resume/ResumeViewer';

interface ApplicationWithDetails extends JobApplication {
  applicant?: {
    userId: string;
    fullName: string;
    email: string;
    profilePhotoUrl?: string;
  };
  job?: {
    id: string;
    title: string;
  };
}

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending Review' },
  { value: 'REVIEWED', label: 'Under Review' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'INTERVIEW', label: 'Interview Scheduled' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
];

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

function JobApplicationsContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      fetchJob();
      fetchApplications();
    }
  }, [jobId, selectedStatus]);

  const fetchJob = async () => {
    try {
      const jobData = await jobsApi.get(jobId);
      setJob(jobData);
    } catch (error: any) {
      console.error('Error fetching job:', error);
      if (error.response?.status === 404) {
        toast.error('Job not found');
        router.push('/dashboard/employer/jobs');
      }
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await applicationsApi.getByJob(jobId);
      setApplications(Array.isArray(response) ? response : []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (applicationId: string, newStatus: string, interviewDate?: string) => {
    setUpdatingStatus(applicationId);
    try {
      await applicationsApi.update(applicationId, {
        status: newStatus as 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED',
        interviewDate: interviewDate ? new Date(interviewDate).toISOString() : undefined,
      });
      toast.success('Application status updated successfully');
      fetchApplications();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update application status');
    } finally {
      setUpdatingStatus(null);
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
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    const label = STATUS_OPTIONS.find(opt => opt.value === status)?.label || status;

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
            <Link href="/dashboard/employer/jobs">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to My Jobs</span>
              </motion.button>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">
              Applications for {job?.title || 'Job'}
            </h1>
            <p className="text-gray-400">
              Review and manage job applications
            </p>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 whitespace-nowrap">Filter by status:</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                <option value="">All Status</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="text-sm text-gray-400">
                {applications.length} application{applications.length !== 1 ? 's' : ''}
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
                {selectedStatus
                  ? 'No applications match the selected filter'
                  : "No one has applied to this job yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {applications.map((application, index) => (
                  <motion.div
                    key={application.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                  >
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Applicant Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {application.applicant?.profilePhotoUrl ? (
                              <img
                                src={application.applicant.profilePhotoUrl}
                                alt={application.applicant.fullName}
                                className="w-12 h-12 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-bold">
                                {application.applicant?.fullName?.[0] || 'A'}
                              </div>
                            )}
                            <div>
                              <h3 className="text-xl font-bold text-white">
                                {application.applicant?.fullName || 'Applicant'}
                              </h3>
                              <p className="text-gray-400 text-sm">
                                {application.applicant?.email || 'No email'}
                              </p>
                            </div>
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
                          <div className="mb-4">
                            <p className="text-gray-400 text-sm mb-1">Cover Letter:</p>
                            <p className="text-gray-300 text-sm line-clamp-3">
                              {application.coverLetter}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          {application.resumeUrl && (
                            <ResumeViewer
                              resumeUrl={application.resumeUrl}
                              applicantName={application.applicant?.fullName}
                              jobTitle={job?.title}
                            />
                          )}
                          {application.portfolioUrl && (
                            <a
                              href={application.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-sm text-teal-400 hover:text-teal-300 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View Portfolio
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Status Actions */}
                      <div className="flex flex-col gap-3 lg:min-w-[200px]">
                        <div>
                          <label className="block text-xs text-gray-400 mb-2">Update Status:</label>
                          <select
                            value={application.status}
                            onChange={(e) => {
                              const newStatus = e.target.value;
                              if (newStatus === 'INTERVIEW') {
                                const interviewDate = prompt('Enter interview date and time (YYYY-MM-DDTHH:mm):');
                                if (interviewDate) {
                                  handleStatusUpdate(application.id, newStatus, interviewDate);
                                }
                              } else {
                                handleStatusUpdate(application.id, newStatus);
                              }
                            }}
                            disabled={updatingStatus === application.id}
                            className="w-full px-3 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                            style={{
                              backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                              borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                            }}
                          >
                            {STATUS_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function JobApplicationsPage() {
  return (
    <ProtectedRoute>
      <JobApplicationsContent />
    </ProtectedRoute>
  );
}

