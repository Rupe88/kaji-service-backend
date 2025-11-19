'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { jobsApi, applicationsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { JobApplicationModal } from '@/components/jobs/JobApplicationModal';

interface JobDetail {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requirements: string;
  responsibilities?: string;
  jobType: string;
  country: string;
  province: string;
  district: string;
  city: string;
  isRemote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  contractDuration?: number;
  requiredSkills: any;
  experienceYears?: number;
  educationLevel?: string;
  totalPositions: number;
  filledPositions: number;
  isActive: boolean;
  isVerified: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  employer?: {
    companyName: string;
    companyEmail: string;
    companyPhone: string;
  };
}

function JobDetailContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobDetail | null>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [kycApproved, setKycApproved] = useState(false);

  useEffect(() => {
    fetchJobDetail();
    checkKYCStatus();
  }, [jobId, user]);

  const fetchJobDetail = async () => {
    try {
      setLoading(true);
      const jobData = await jobsApi.get(jobId);
      setJob(jobData as any);

      // Check if user has already applied
      if (user?.id) {
        try {
          const userApplications = await applicationsApi.getByUser(user.id);
          const applied = userApplications.some((app: any) => app.jobId === jobId);
          setHasApplied(applied);
        } catch (error) {
          // User might not have any applications yet
          setHasApplied(false);
        }
      }
    } catch (error: any) {
      console.error('Error fetching job detail:', error);
      if (error.response?.status === 404) {
        toast.error('Job not found');
        router.push('/dashboard/jobs');
      } else {
        toast.error('Failed to load job details');
      }
    } finally {
      setLoading(false);
    }
  };

  const checkKYCStatus = async () => {
    if (!user?.id || !user?.role) return;
    try {
      const { kycApi } = await import('@/lib/api-client');
      const kycData = await kycApi.getKYC(user.id, user.role);
      setKycApproved(kycData?.status === 'APPROVED');
    } catch (error) {
      setKycApproved(false);
    }
  };

  const handleApply = () => {
    // Block industrial users (employers) from applying
    if (user?.role === 'INDUSTRIAL') {
      toast.error('Employers cannot apply for jobs. Please use an individual account to apply.');
      return;
    }

    // Only allow individual users to apply
    if (user?.role !== 'INDIVIDUAL') {
      toast.error('Only individual job seekers can apply for jobs');
      return;
    }

    if (!kycApproved) {
      toast.error('Please complete KYC verification to apply for jobs');
      router.push('/kyc/individual');
      return;
    }

    if (hasApplied) {
      toast.error('You have already applied for this job');
      return;
    }

    setShowApplicationModal(true);
  };

  const handleApplicationSuccess = async () => {
    setHasApplied(true);
    // Refresh job data to get updated application count
    await fetchJobDetail();
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatSalary = () => {
    if (!job?.salaryMin && !job?.salaryMax) return 'Not specified';
    const min = job.salaryMin?.toLocaleString() || '0';
    const max = job.salaryMax?.toLocaleString() || '0';
    return `Rs. ${min} - ${max} ${job.salaryType || 'per month'}`;
  };

  const formatLocation = () => {
    const parts = [job?.city, job?.district, job?.province].filter(Boolean);
    return parts.join(', ') || 'Location not specified';
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading job details...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">Job not found</p>
            <Link href="/dashboard/jobs">
              <Button variant="primary">Back to Jobs</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Back Button */}
        <Link href="/dashboard/jobs">
          <motion.button
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Jobs</span>
          </motion.button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Job Header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
                  {job.employer && (
                    <p className="text-xl text-gray-300 mb-2">{job.employer.companyName}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{formatLocation()}</span>
                    </div>
                    {job.isRemote && (
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Remote</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Posted {formatDate(job.createdAt)}</span>
                    </div>
                  </div>
                </div>
                {job.isVerified && (
                  <div className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30">
                    <span className="text-green-400 text-xs font-semibold">Verified</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Job Description */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-4">Job Description</h2>
              <div 
                className="prose prose-invert max-w-none text-gray-300"
                dangerouslySetInnerHTML={{ __html: job.description }}
                style={{
                  color: '#d1d5db',
                }}
              />
            </motion.div>

            {/* Requirements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-4">Requirements</h2>
              <div 
                className="prose prose-invert max-w-none text-gray-300"
                dangerouslySetInnerHTML={{ __html: job.requirements }}
                style={{
                  color: '#d1d5db',
                }}
              />
            </motion.div>

            {/* Responsibilities */}
            {job.responsibilities && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <h2 className="text-2xl font-bold text-white mb-4">Responsibilities</h2>
                <div 
                  className="prose prose-invert max-w-none text-gray-300"
                  dangerouslySetInnerHTML={{ __html: job.responsibilities }}
                  style={{
                    color: '#d1d5db',
                  }}
                />
              </motion.div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="sticky top-24 space-y-6"
            >
              {/* Apply Card */}
              <div className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <div className="space-y-4">
                  <div>
                    <p className="text-2xl font-bold text-white mb-1">{formatSalary()}</p>
                    <p className="text-gray-400 text-sm">{job.jobType.replace(/_/g, ' ')}</p>
                  </div>
                  <div className="pt-4 border-t border-gray-800/50">
                    {/* Only show Apply button for individual users */}
                    {user?.role === 'INDIVIDUAL' ? (
                      <>
                        <Button
                          onClick={handleApply}
                          variant="primary"
                          size="lg"
                          className="w-full"
                          disabled={hasApplied || !job.isActive}
                        >
                          {hasApplied ? 'Already Applied' : 'Apply Now'}
                        </Button>
                        {!kycApproved && (
                          <p className="text-yellow-400 text-xs mt-2 text-center">
                            KYC verification required to apply
                          </p>
                        )}
                      </>
                    ) : user?.role === 'INDUSTRIAL' ? (
                      <div className="p-4 rounded-xl bg-yellow-500/20 border border-yellow-500/30">
                        <p className="text-yellow-400 text-sm text-center">
                          Employers cannot apply for jobs. This page is for job seekers only.
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Job Details */}
              <div className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Job Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-400 mb-1">Job Type</p>
                    <p className="text-white">{job.jobType.replace(/_/g, ' ')}</p>
                  </div>
                  {job.experienceYears && (
                    <div>
                      <p className="text-gray-400 mb-1">Experience Required</p>
                      <p className="text-white">{job.experienceYears} years</p>
                    </div>
                  )}
                  {job.educationLevel && (
                    <div>
                      <p className="text-gray-400 mb-1">Education Level</p>
                      <p className="text-white">{job.educationLevel}</p>
                    </div>
                  )}
                  {job.contractDuration && (
                    <div>
                      <p className="text-gray-400 mb-1">Contract Duration</p>
                      <p className="text-white">{job.contractDuration} months</p>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-400 mb-1">Positions Available</p>
                    <p className="text-white">{job.totalPositions - job.filledPositions} of {job.totalPositions}</p>
                  </div>
                  {job.expiresAt && (
                    <div>
                      <p className="text-gray-400 mb-1">Expires On</p>
                      <p className="text-white">{formatDate(job.expiresAt)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Company Info */}
              {job.employer && (
                <div className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <h3 className="text-xl font-bold text-white mb-4">Company</h3>
                  <div className="space-y-2 text-sm">
                    <p className="text-white font-semibold">{job.employer.companyName}</p>
                    {job.employer.companyEmail && (
                      <p className="text-gray-400">{job.employer.companyEmail}</p>
                    )}
                    {job.employer.companyPhone && (
                      <p className="text-gray-400">{job.employer.companyPhone}</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {user?.id && (
        <JobApplicationModal
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          jobId={jobId}
          applicantId={user.id}
          onSuccess={handleApplicationSuccess}
        />
      )}
    </DashboardLayout>
  );
}

export default function JobDetailPage() {
  return (
    <ProtectedRoute>
      <JobDetailContent />
    </ProtectedRoute>
  );
}

