'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { urgentJobsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { DistanceDisplay } from '@/components/urgent-jobs/DistanceDisplay';
import { getCurrentLocation, calculateHaversineDistance } from '@/utils/distance';

interface Application {
  id: string;
  status: string;
  appliedAt: string;
  acceptedAt?: string;
  completedAt?: string;
  job: {
    id: string;
    title: string;
    description: string;
    category: string;
    province: string;
    district: string;
    city: string;
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
    contactPhone: string;
    contactMethod?: string;
    poster: {
      id: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
    };
  };
}

function MyApplicationsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    fetchMyApplications();
    getCurrentLocation()
      .then(location => setUserLocation(location))
      .catch(() => {});
  }, []);

  const fetchMyApplications = async () => {
    setLoading(true);
    try {
      const response = await urgentJobsApi.getMyApplications();
      setApplications(response.data || []);
    } catch (error: any) {
      console.error('Error fetching my applications:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch your applications');
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'oklch(0.8 0.15 90)';
      case 'ACCEPTED':
        return 'oklch(0.7 0.15 180)';
      case 'REJECTED':
        return 'oklch(0.65 0.2 330)';
      case 'COMPLETED':
        return 'oklch(0.7 0.15 180)';
      default:
        return 'oklch(0.7 0.15 180)';
    }
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

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Link href="/dashboard/urgent-jobs" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Urgent Jobs
              </Link>
              <h1 className="text-4xl font-bold text-white mb-2">My Applications</h1>
              <p className="text-gray-400">Track your urgent job applications</p>
            </div>

            {/* Applications List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180)' }}></div>
              </div>
            ) : applications.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg mb-4">You haven't applied to any urgent jobs yet</p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard/urgent-jobs')}
                >
                  Browse Urgent Jobs
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => {
                  const job = application.job;
                  let distance: number | null = null;
                  
                  if (userLocation && job.latitude && job.longitude) {
                    distance = calculateHaversineDistance(
                      userLocation.latitude,
                      userLocation.longitude,
                      job.latitude,
                      job.longitude
                    );
                  }

                  return (
                    <motion.div
                      key={application.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border-2 backdrop-blur-xl p-6"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span
                              className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: `${getStatusColor(application.status)} / 0.2`,
                                color: getStatusColor(application.status),
                              }}
                            >
                              {application.status}
                            </span>
                            <span
                              className="px-3 py-1 rounded-full text-xs font-semibold"
                              style={{
                                backgroundColor: `${getUrgencyColor(job.urgencyLevel)} / 0.2`,
                                color: getUrgencyColor(job.urgencyLevel),
                              }}
                            >
                              {job.urgencyLevel}
                            </span>
                            {distance !== null && <DistanceDisplay distance={distance} />}
                          </div>
                          
                          <h3 className="text-2xl font-bold text-white mb-2">{job.title}</h3>
                          <p className="text-gray-300 mb-4 line-clamp-2">{job.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div>
                              <p className="text-sm text-gray-400">Payment</p>
                              <p className="text-white font-semibold">
                                NPR {job.paymentAmount.toLocaleString()}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Category</p>
                              <p className="text-white font-semibold">
                                {getCategoryLabel(job.category)}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Location</p>
                              <p className="text-white font-semibold">
                                {job.city}, {job.district}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Start Time</p>
                              <p className="text-white font-semibold text-sm">
                                {new Date(job.startTime).toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-400">
                            <span>Applied: {new Date(application.appliedAt).toLocaleString()}</span>
                            {application.acceptedAt && (
                              <span>Accepted: {new Date(application.acceptedAt).toLocaleString()}</span>
                            )}
                          </div>

                          {application.status === 'ACCEPTED' && job.poster.phone && (
                            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.1)' }}>
                              <p className="text-sm text-gray-400 mb-1">Contact Poster</p>
                              <p className="text-white font-semibold">{job.contactPhone}</p>
                              {job.contactMethod && (
                                <p className="text-sm text-gray-400">{job.contactMethod}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="primary"
                            onClick={() => router.push(`/dashboard/urgent-jobs/${job.id}`)}
                          >
                            View Job
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function MyApplicationsPage() {
  return <MyApplicationsContent />;
}

