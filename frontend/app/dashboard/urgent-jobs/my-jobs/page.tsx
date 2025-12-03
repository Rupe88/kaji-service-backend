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

interface UrgentJob {
  id: string;
  title: string;
  description: string;
  category: string;
  province: string;
  district: string;
  city: string;
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
  createdAt: string;
  applications: Array<{
    id: string;
    status: string;
    applicant: {
      id: string;
      firstName?: string;
      lastName?: string;
    };
  }>;
}

function MyUrgentJobsContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<UrgentJob[]>([]);

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    setLoading(true);
    try {
      const response = await urgentJobsApi.getMyJobs();
      setJobs(response.data || []);
    } catch (error: any) {
      console.error('Error fetching my urgent jobs:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch your urgent jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this urgent job?')) return;

    try {
      await urgentJobsApi.delete(id);
      toast.success('Urgent job deleted');
      fetchMyJobs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete urgent job');
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">My Urgent Jobs</h1>
                  <p className="text-gray-400">Manage your posted urgent jobs</p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard/urgent-jobs/post')}
                >
                  Post New Job
                </Button>
              </div>
            </div>

            {/* Jobs List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180)' }}></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg mb-4">You haven't posted any urgent jobs yet</p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard/urgent-jobs/post')}
                >
                  Post Your First Urgent Job
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => {
                  const pendingCount = job.applications.filter(app => app.status === 'PENDING').length;
                  const acceptedCount = job.applications.filter(app => app.status === 'ACCEPTED').length;

                  return (
                    <motion.div
                      key={job.id}
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
                                backgroundColor: `${getStatusColor(job.status)} / 0.2`,
                                color: getStatusColor(job.status),
                              }}
                            >
                              {job.status}
                            </span>
                            <span className="text-sm text-gray-400">{getCategoryLabel(job.category)}</span>
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
                              <p className="text-sm text-gray-400">Workers</p>
                              <p className="text-white font-semibold">
                                {job.currentWorkers}/{job.maxWorkers}
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

                          {pendingCount > 0 && (
                            <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'oklch(0.8 0.15 90 / 0.1)' }}>
                              <p className="text-sm" style={{ color: 'oklch(0.8 0.15 90)' }}>
                                {pendingCount} pending application{pendingCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}

                          {acceptedCount > 0 && (
                            <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.1)' }}>
                              <p className="text-sm" style={{ color: 'oklch(0.7 0.15 180)' }}>
                                {acceptedCount} accepted worker{acceptedCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 ml-4">
                          <Button
                            variant="primary"
                            onClick={() => router.push(`/dashboard/urgent-jobs/${job.id}`)}
                          >
                            View
                          </Button>
                          {job.status === 'OPEN' && (
                            <Button
                              variant="outline"
                              onClick={() => router.push(`/dashboard/urgent-jobs/${job.id}?edit=true`)}
                            >
                              Edit
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            onClick={() => handleDelete(job.id)}
                            className="text-red-400 border-red-400/20 hover:bg-red-400/10"
                          >
                            Delete
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

export default function MyUrgentJobsPage() {
  return <MyUrgentJobsContent />;
}

