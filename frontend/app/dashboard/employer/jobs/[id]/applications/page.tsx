'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useSocket } from '@/hooks/useSocket';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { jobsApi, applicationsApi, exportApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { JobApplication } from '@/types/api';
import { ResumeViewer } from '@/components/resume/ResumeViewer';
import { JobLocationMap } from '@/components/jobs/JobLocationMap';

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
  const { notifications } = useSocket();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [applicationCount, setApplicationCount] = useState<number>(0);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [selectedApplicationForInterview, setSelectedApplicationForInterview] = useState<string | null>(null);
  const [interviewDateInput, setInterviewDateInput] = useState('');

  useEffect(() => {
    if (jobId) {
      fetchJob();
      fetchApplications();
    }
  }, [jobId, selectedStatus]);

  // Listen for new application notifications and refresh
  useEffect(() => {
    // Check if there's a new JOB_APPLICATION notification for this job
    const latestNotification = notifications[0];
    if (
      latestNotification &&
      latestNotification.type === 'JOB_APPLICATION' &&
      latestNotification.data?.jobId === jobId
    ) {
      // Refresh applications when a new one is received
      console.log('🔄 New application notification received, refreshing list...');
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications, jobId]);

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

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await applicationsApi.getByJob(jobId);
      if (response && typeof response === 'object' && 'data' in response) {
        setApplications(Array.isArray(response.data) ? response.data : []);
        setApplicationCount(response.count || 0);
      } else if (Array.isArray(response)) {
        // Fallback for old API format
        const applicationsArray = response as ApplicationWithDetails[];
        setApplications(applicationsArray);
        setApplicationCount(applicationsArray.length);
      } else {
        setApplications([]);
        setApplicationCount(0);
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      if (error.response?.status === 403) {
        toast.error('You do not have permission to view applications for this job');
        router.push('/dashboard/employer/jobs');
      } else if (error.response?.status === 404) {
        toast.error('Job not found');
        router.push('/dashboard/employer/jobs');
      } else {
        toast.error('Failed to load applications');
      }
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, [jobId, selectedStatus, router]);

  const handleStatusUpdate = async (applicationId: string, newStatus: string, interviewDate?: string) => {
    setUpdatingStatus(applicationId);
    try {
      const updateData: any = {
        status: newStatus as 'PENDING' | 'REVIEWED' | 'SHORTLISTED' | 'INTERVIEW' | 'ACCEPTED' | 'REJECTED',
      };
      
      // Only include interviewDate if status is INTERVIEW and date is provided
      if (newStatus === 'INTERVIEW' && interviewDate) {
        updateData.interviewDate = new Date(interviewDate).toISOString();
      } else if (newStatus !== 'INTERVIEW') {
        // Clear interview date if status is not INTERVIEW
        updateData.interviewDate = null;
      }
      
      await applicationsApi.update(applicationId, updateData);
      toast.success('Application status updated successfully');
      fetchApplications();
      setShowInterviewModal(false);
      setSelectedApplicationForInterview(null);
      setInterviewDateInput('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update application status');
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleStatusChange = (applicationId: string, newStatus: string) => {
    if (newStatus === 'INTERVIEW') {
      // Show modal for interview date input
      setSelectedApplicationForInterview(applicationId);
      setShowInterviewModal(true);
    } else {
      // Update status directly for non-interview statuses
      handleStatusUpdate(applicationId, newStatus);
    }
  };

  const handleInterviewSubmit = () => {
    if (!selectedApplicationForInterview || !interviewDateInput) {
      toast.error('Please enter an interview date and time');
      return;
    }
    handleStatusUpdate(selectedApplicationForInterview, 'INTERVIEW', interviewDateInput);
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Applications for {job?.title || 'Job'}
                </h1>
                <p className="text-gray-400">
                  {applicationCount > 0 ? (
                    <>
                      {applicationCount} {applicationCount === 1 ? 'application' : 'applications'} received
                    </>
                  ) : (
                    'Review and manage job applications'
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {applicationCount > 0 && (
                  <>
                    <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{
                      backgroundColor: 'oklch(0.7 0.15 180 / 0.2)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}>
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="text-lg font-bold text-white">{applicationCount}</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const blob = await exportApi.exportApplications({ format: 'csv', jobId });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `applications-${job?.title?.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                          toast.success('Applications exported successfully!');
                        } catch (error: any) {
                          toast.error('Failed to export applications');
                        }
                      }}
                      className="px-4 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Export CSV
                    </button>
                  </>
                )}
              </div>
            </div>
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
                              handleStatusChange(application.id, newStatus);
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

          {/* Location Map */}
          {job?.latitude && job?.longitude && !job?.isRemote && !job?.remoteWork && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              {/* Location Header */}
              <div className="p-6 border-b border-gray-800/50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Job Location
                    </h3>
                    <p className="text-gray-300 text-sm">
                      {job.city && job.district && job.province
                        ? `${job.city}, ${job.district}, ${job.province}`
                        : job.district && job.province
                        ? `${job.district}, ${job.province}`
                        : job.province || 'Location not specified'}
                    </p>
                  </div>
                  <a
                    href={`https://www.google.com/maps?q=${job.latitude},${job.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-400 text-sm font-medium transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    Open in Maps
                  </a>
                </div>
              </div>
              
              {/* Map Container */}
              <div className="relative">
                <JobLocationMap
                  latitude={job.latitude}
                  longitude={job.longitude}
                  jobTitle={job.title}
                  companyName={job.employer?.companyName}
                  radiusKm={10}
                  height="400px"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Interview Date Modal */}
      <AnimatePresence>
        {showInterviewModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowInterviewModal(false);
                setSelectedApplicationForInterview(null);
                setInterviewDateInput('');
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex flex-col rounded-2xl border-2 overflow-hidden max-w-md mx-auto"
              style={{
                backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                <h2 className="text-2xl font-bold text-white">Schedule Interview</h2>
                <p className="text-gray-400 mt-1">Enter the interview date and time</p>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Interview Date & Time <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={interviewDateInput}
                      onChange={(e) => setInterviewDateInput(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select a date and time for the interview
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-6 border-t-2 flex items-center justify-end gap-3" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                <button
                  onClick={() => {
                    setShowInterviewModal(false);
                    setSelectedApplicationForInterview(null);
                    setInterviewDateInput('');
                  }}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInterviewSubmit}
                  disabled={!interviewDateInput || updatingStatus === selectedApplicationForInterview}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  {updatingStatus === selectedApplicationForInterview ? 'Scheduling...' : 'Schedule Interview'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
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

