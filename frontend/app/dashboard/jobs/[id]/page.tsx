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
import { JobLocationMap } from '@/components/jobs/JobLocationMap';

interface JobDetail {
  id: string;
  employerId: string;
  title: string;
  description: string;
  requirements: string;
  responsibilities?: string;
  jobType: string;
  country?: string;
  province?: string;
  district?: string;
  city?: string;
  location?: {
    province: string;
    district: string;
    city?: string;
    municipality?: string;
    isRemote?: boolean;
  };
  isRemote?: boolean;
  remoteWork?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  salaryMin?: number;
  salaryMax?: number;
  salaryType?: string;
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
  };
  contractDuration?: number;
  requiredSkills: any;
  experienceYears?: number;
  educationLevel?: string;
  totalPositions?: number;
  numberOfPositions?: number;
  filledPositions?: number;
  isActive?: boolean;
  isVerified?: boolean;
  verified?: boolean;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  employer?: {
    companyName: string;
    companyEmail?: string;
    companyPhone?: string;
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
  const [kycStatus, setKycStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

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
      if (!kycData) {
        // No KYC submitted
        setKycStatus('NONE');
        setKycApproved(false);
      } else {
        // KYC exists, check status
        const status = kycData.status || 'PENDING';
        setKycStatus(status);
        setKycApproved(status === 'APPROVED');
        
        // Get user location from KYC if available
        if (user.role === 'INDIVIDUAL' && (kycData as any).latitude && (kycData as any).longitude) {
          setUserLocation({
            latitude: (kycData as any).latitude,
            longitude: (kycData as any).longitude,
          });
        }
      }
    } catch (error) {
      // Error fetching KYC - assume no KYC
      setKycStatus('NONE');
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

    // Check KYC status
    if (kycStatus === 'NONE' || !kycStatus) {
      // No KYC submitted - redirect to KYC page
      toast.error('Please complete KYC verification to apply for jobs');
      router.push('/kyc/individual');
      return;
    }

    if (kycStatus === 'PENDING') {
      // KYC is pending - show message, don't redirect
      toast.error('Your KYC is pending. Please wait for admin approval before applying to jobs.');
      return;
    }

    if (kycStatus === 'REJECTED') {
      // KYC was rejected - redirect to resubmit
      toast.error('Your KYC was rejected. Please resubmit your KYC to apply for jobs.');
      router.push('/kyc/individual');
      return;
    }

    if (!kycApproved || kycStatus !== 'APPROVED') {
      // Fallback - shouldn't reach here
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
    // Try salaryRange first (from backend transformation)
    if (job?.salaryRange) {
      const min = job.salaryRange.min?.toLocaleString() || '0';
      const max = job.salaryRange.max?.toLocaleString() || '0';
      return `Rs. ${min} - ${max} ${job.salaryRange.currency || 'per month'}`;
    }
    // Fallback to direct properties
    if (!job?.salaryMin && !job?.salaryMax) return 'Not specified';
    const min = job.salaryMin?.toLocaleString() || '0';
    const max = job.salaryMax?.toLocaleString() || '0';
    return `Rs. ${min} - ${max} ${job.salaryType || 'per month'}`;
  };

  // Calculate distance using Haversine formula
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  };

  // Format distance (km or meters)
  const formatDistance = (distanceKm: number): string => {
    if (distanceKm < 1) {
      // Show in meters if less than 1km
      const meters = Math.round(distanceKm * 1000);
      return `${meters}m away`;
    } else if (distanceKm < 10) {
      // Show one decimal place for distances less than 10km
      return `${Math.round(distanceKm * 10) / 10}km away`;
    } else {
      // Show rounded for distances 10km or more
      return `${Math.round(distanceKm)}km away`;
    }
  };

  const formatLocation = () => {
    let locationStr = '';
    
    if (job?.location) {
      const parts = [
        job.location.city || job.location.municipality,
        job.location.district,
        job.location.province
      ].filter(Boolean);
      if (parts.length > 0) {
        locationStr = parts.join(', ');
      }
    }
    
    // Fallback to direct properties if location object doesn't exist (for backward compatibility)
    if (!locationStr) {
      const parts = [job?.city, job?.district, job?.province].filter(Boolean);
      if (parts.length > 0) {
        locationStr = parts.join(', ');
      }
    }
    
    if (!locationStr) return 'Location not specified';
    
    // Add distance if user location and job location are available and not remote
    if (
      job &&
      userLocation &&
      (job as any).latitude &&
      (job as any).longitude &&
      !job.isRemote &&
      !job.remoteWork &&
      !job.location?.isRemote
    ) {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        (job as any).latitude,
        (job as any).longitude
      );
      locationStr += ` • ${formatDistance(distance)}`;
    }
    
    return locationStr;
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
                    {(job.isRemote || job.remoteWork || job.location?.isRemote) && (
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
                {(job.isVerified || job.verified) && (
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
                          variant={hasApplied ? "outline" : "primary"}
                          size="lg"
                          className={`w-full ${hasApplied ? 'opacity-60 cursor-not-allowed' : ''}`}
                          disabled={hasApplied || !job.isActive}
                        >
                          {hasApplied ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Already Applied
                            </span>
                          ) : (
                            'Apply Now'
                          )}
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
                    <p className="text-white">
                      {(job.numberOfPositions || job.totalPositions || 1) - (job.filledPositions || 0)} of {job.numberOfPositions || job.totalPositions || 1}
                    </p>
                  </div>
                  {job.expiresAt && (
                    <div>
                      <p className="text-gray-400 mb-1">Expires On</p>
                      <p className="text-white">{formatDate(job.expiresAt)}</p>
                    </div>
                  )}
                  {/* Location with Distance */}
                  {!job.isRemote && !job.remoteWork && !job.location?.isRemote && (
                    <div>
                      <p className="text-gray-400 mb-1">Location</p>
                      <p className="text-white">{formatLocation()}</p>
                      {userLocation && (job as any).latitude && (job as any).longitude && (
                        <p className="text-teal-400 text-xs mt-1">
                          📍 {formatDistance(calculateDistance(
                            userLocation.latitude,
                            userLocation.longitude,
                            (job as any).latitude,
                            (job as any).longitude
                          ))}
                        </p>
                      )}
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

              {/* Location Map */}
              {job.latitude && job.longitude && !job.isRemote && !job.remoteWork && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="rounded-2xl border-2 backdrop-blur-xl overflow-hidden"
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
                        <p className="text-gray-300 text-sm">{formatLocation()}</p>
                        {userLocation && job.latitude && job.longitude && (
                          <div className="mt-2 flex items-center gap-2 text-teal-400 text-sm font-medium">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            </svg>
                            {formatDistance(calculateDistance(
                              userLocation.latitude,
                              userLocation.longitude,
                              job.latitude,
                              job.longitude
                            ))}
                          </div>
                        )}
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
                      userLatitude={userLocation?.latitude}
                      userLongitude={userLocation?.longitude}
                      distance={userLocation && job.latitude && job.longitude ? calculateDistance(
                        userLocation.latitude,
                        userLocation.longitude,
                        job.latitude,
                        job.longitude
                      ) : undefined}
                      height="400px"
                    />
                  </div>
                </motion.div>
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

