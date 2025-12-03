'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { urgentJobsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { DistanceDisplay } from '@/components/urgent-jobs/DistanceDisplay';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { getCurrentLocation, calculateHaversineDistance } from '@/utils/distance';

interface UrgentJob {
  id: string;
  title: string;
  description: string;
  category: string;
  province: string;
  district: string;
  city: string;
  ward?: string;
  street?: string;
  latitude?: number | null;
  longitude?: number | null;
  paymentAmount: number;
  paymentType: string;
  urgencyLevel: string;
  status: string;
  maxWorkers: number;
  currentWorkers: number;
  startTime: string;
  endTime?: string | null;
  expiresAt?: string | null;
  contactPhone: string;
  contactMethod?: string;
  imageUrl?: string;
  createdAt: string;
  poster: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    profileImage?: string;
  };
  applications: Array<{
    id: string;
    status: string;
    applicant: {
      id: string;
      firstName?: string;
      lastName?: string;
      profileImage?: string;
    };
    appliedAt: string;
    acceptedAt?: string;
  }>;
}

function UrgentJobDetailContent() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
  const jobId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [job, setJob] = useState<UrgentJob | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [userApplication, setUserApplication] = useState<any>(null);
  const [isPoster, setIsPoster] = useState(false);

  useEffect(() => {
    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  useEffect(() => {
    if (job && user?.id) {
      setIsPoster(job.poster.id === user.id);
      const application = job.applications.find(app => app.applicant.id === user.id);
      setUserApplication(application || null);
      
      // Get user location and calculate distance
      getCurrentLocation()
        .then(location => {
          if (job.latitude && job.longitude) {
            const dist = calculateHaversineDistance(
              location.latitude,
              location.longitude,
              job.latitude,
              job.longitude
            );
            setDistance(dist);
          }
        })
        .catch(() => {
          // Location not available
        });
    }
  }, [job, user]);

  const fetchJob = async () => {
    setLoading(true);
    try {
      const response = await urgentJobsApi.get(jobId);
      setJob(response.data);
    } catch (error: any) {
      console.error('Error fetching urgent job:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch urgent job');
      router.push('/dashboard/urgent-jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!user) {
      toast.error('Please login to apply');
      return;
    }

    setApplying(true);
    try {
      await urgentJobsApi.apply(jobId);
      toast.success('Application submitted successfully!');
      fetchJob(); // Refresh job data
    } catch (error: any) {
      console.error('Error applying:', error);
      toast.error(error.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleAcceptApplication = async (applicationId: string) => {
    try {
      await urgentJobsApi.acceptApplication(jobId, applicationId);
      toast.success('Application accepted');
      fetchJob();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to accept application');
    }
  };

  const handleComplete = async () => {
    if (!confirm('Mark this job as completed?')) return;
    
    try {
      await urgentJobsApi.complete(jobId);
      toast.success('Job marked as completed');
      fetchJob();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete job');
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      HAND_TO_HAND: 'Hand to Hand',
      CASH_TO_CASH: 'Cash to Cash',
      LABOR: 'Labor Work',
      OTHER: 'Other',
    };
    return labels[category] || category;
  };

  const getUrgencyLabel = (urgency: string) => {
    const labels: Record<string, string> = {
      IMMEDIATE: 'Immediate',
      TODAY: 'Today',
      WITHIN_HOURS: 'Within Hours',
    };
    return labels[urgency] || urgency;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return 'oklch(0.65 0.2 330)';
      case 'TODAY':
        return 'oklch(0.7 0.15 70)';
      case 'WITHIN_HOURS':
        return 'oklch(0.8 0.15 90)';
      default:
        return 'oklch(0.7 0.15 180)';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'oklch(0.7 0.15 180)';
      case 'IN_PROGRESS':
        return 'oklch(0.8 0.15 90)';
      case 'COMPLETED':
        return 'oklch(0.7 0.15 180)';
      case 'CANCELLED':
        return 'oklch(0.65 0.2 330)';
      default:
        return 'oklch(0.7 0.15 180)';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180)' }}></div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  if (!job) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="p-6 lg:p-8">
            <div className="text-center py-20">
              <p className="text-gray-400 text-lg mb-4">Job not found</p>
              <Button variant="primary" onClick={() => router.push('/dashboard/urgent-jobs')}>
                Back to Urgent Jobs
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    );
  }

  const canApply = !isPoster && !userApplication && job.status === 'OPEN' && job.currentWorkers < job.maxWorkers;
  const pendingApplications = job.applications.filter(app => app.status === 'PENDING');
  const acceptedApplications = job.applications.filter(app => app.status === 'ACCEPTED');

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Link href="/dashboard/urgent-jobs" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Urgent Jobs
              </Link>

              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${getUrgencyColor(job.urgencyLevel)} / 0.2`,
                        color: getUrgencyColor(job.urgencyLevel),
                      }}
                    >
                      {getUrgencyLabel(job.urgencyLevel)}
                    </span>
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: `${getStatusColor(job.status)} / 0.2`,
                        color: getStatusColor(job.status),
                      }}
                    >
                      {job.status}
                    </span>
                    {distance !== null && <DistanceDisplay distance={distance} />}
                  </div>
                  <h1 className="text-4xl font-bold text-white mb-2">{job.title}</h1>
                  <p className="text-gray-400">{getCategoryLabel(job.category)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Description */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 backdrop-blur-xl p-6"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                  }}
                >
                  <h2 className="text-2xl font-bold text-white mb-4">Description</h2>
                  <p className="text-gray-300 whitespace-pre-wrap">{job.description}</p>
                </motion.div>

                {/* Image */}
                {job.imageUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                  >
                    <img src={job.imageUrl} alt={job.title} className="w-full h-auto" />
                  </motion.div>
                )}

                {/* Applications (for poster) */}
                {isPoster && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl border-2 backdrop-blur-xl p-6"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                  >
                    <h2 className="text-2xl font-bold text-white mb-4">Applications</h2>
                    
                    {pendingApplications.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">Pending ({pendingApplications.length})</h3>
                        <div className="space-y-3">
                          {pendingApplications.map((app) => (
                            <div
                              key={app.id}
                              className="p-4 rounded-lg"
                              style={{ backgroundColor: 'oklch(0.15 0 0 / 0.5)' }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  {app.applicant.profileImage ? (
                                    <img
                                      src={app.applicant.profileImage}
                                      alt={app.applicant.firstName}
                                      className="w-10 h-10 rounded-full"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                                      <span className="text-white font-semibold">
                                        {app.applicant.firstName?.[0] || 'U'}
                                      </span>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-white font-medium">
                                      {app.applicant.firstName} {app.applicant.lastName}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                      Applied {new Date(app.appliedAt).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="primary"
                                  onClick={() => handleAcceptApplication(app.id)}
                                  disabled={job.currentWorkers >= job.maxWorkers}
                                >
                                  Accept
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {acceptedApplications.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-3">Accepted ({acceptedApplications.length})</h3>
                        <div className="space-y-3">
                          {acceptedApplications.map((app) => (
                            <div
                              key={app.id}
                              className="p-4 rounded-lg"
                              style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.1)' }}
                            >
                              <div className="flex items-center gap-3">
                                {app.applicant.profileImage ? (
                                  <img
                                    src={app.applicant.profileImage}
                                    alt={app.applicant.firstName}
                                    className="w-10 h-10 rounded-full"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                                    <span className="text-white font-semibold">
                                      {app.applicant.firstName?.[0] || 'U'}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <p className="text-white font-medium">
                                    {app.applicant.firstName} {app.applicant.lastName}
                                  </p>
                                  <p className="text-sm text-gray-400">
                                    Accepted {app.acceptedAt ? new Date(app.acceptedAt).toLocaleString() : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {pendingApplications.length === 0 && acceptedApplications.length === 0 && (
                      <p className="text-gray-400">No applications yet</p>
                    )}

                    {job.status !== 'COMPLETED' && (
                      <div className="mt-6">
                        <Button
                          variant="primary"
                          onClick={handleComplete}
                          className="w-full"
                        >
                          Mark as Completed
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Job Details Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 backdrop-blur-xl p-6"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                  }}
                >
                  <h2 className="text-xl font-bold text-white mb-4">Job Details</h2>
                  
                  <div className="space-y-4">
                    {/* Payment */}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Payment</p>
                      <p className="text-lg font-semibold" style={{ color: 'oklch(0.7 0.15 180)' }}>
                        NPR {job.paymentAmount.toLocaleString()} ({job.paymentType})
                      </p>
                    </div>

                    {/* Workers */}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Workers</p>
                      <p className="text-white">
                        {job.currentWorkers} / {job.maxWorkers}
                      </p>
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Location</p>
                      <p className="text-white">
                        {job.city}, {job.district}, {job.province}
                      </p>
                      {job.ward && <p className="text-sm text-gray-400">Ward {job.ward}</p>}
                      {job.street && <p className="text-sm text-gray-400">{job.street}</p>}
                    </div>

                    {/* Start Time */}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Start Time</p>
                      <p className="text-white">{new Date(job.startTime).toLocaleString()}</p>
                    </div>

                    {job.endTime && (
                      <div>
                        <p className="text-sm text-gray-400 mb-1">End Time</p>
                        <p className="text-white">{new Date(job.endTime).toLocaleString()}</p>
                      </div>
                    )}

                    {/* Contact */}
                    <div>
                      <p className="text-sm text-gray-400 mb-1">Contact</p>
                      <p className="text-white">{job.contactPhone}</p>
                      {job.contactMethod && (
                        <p className="text-sm text-gray-400">{job.contactMethod}</p>
                      )}
                    </div>
                  </div>

                  {/* Apply Button */}
                  {canApply && (
                    <Button
                      variant="primary"
                      className="w-full mt-6"
                      onClick={handleApply}
                      isLoading={applying}
                    >
                      Apply Now
                    </Button>
                  )}

                  {/* Application Status */}
                  {userApplication && (
                    <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.1)' }}>
                      <p className="text-sm text-gray-400 mb-1">Your Application Status</p>
                      <p className="text-lg font-semibold" style={{ color: 'oklch(0.7 0.15 180)' }}>
                        {userApplication.status}
                      </p>
                    </div>
                  )}

                  {/* Poster Info */}
                  <div className="mt-6 pt-6 border-t" style={{ borderColor: 'oklch(0.17 0 0 / 0.5)' }}>
                    <p className="text-sm text-gray-400 mb-2">Posted by</p>
                    <div className="flex items-center gap-3">
                      {job.poster.profileImage ? (
                        <img
                          src={job.poster.profileImage}
                          alt={job.poster.firstName}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                          <span className="text-white font-semibold">
                            {job.poster.firstName?.[0] || 'U'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-white font-medium">
                          {job.poster.firstName} {job.poster.lastName}
                        </p>
                        <p className="text-sm text-gray-400">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function UrgentJobDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <UrgentJobDetailContent />
    </Suspense>
  );
}

