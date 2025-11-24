'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { trainingApi, walletApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TrainingEnrollment } from '@/types/api';

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ENROLLED: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  IN_PROGRESS: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  COMPLETED: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  DROPPED: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

function MyTrainingsContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchEnrollments();
    }
  }, [user?.id, selectedStatus]);

  const fetchEnrollments = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const params: any = {
        userId: user.id,
      };
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await trainingApi.getEnrollments(params);
      setEnrollments(response.data || []);
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      toast.error('Failed to load your trainings');
      setEnrollments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteCourse = async (enrollment: TrainingEnrollment) => {
    if (!enrollment.id) return;

    if (enrollment.progress < 100) {
      toast.error('Please complete 100% of the course before marking it as complete');
      return;
    }

    try {
      setUpdating(enrollment.id);
      
      // Update enrollment to completed - backend automatically awards coins
      const response = await trainingApi.updateEnrollment(enrollment.id, {
        status: 'COMPLETED',
        progress: 100,
        completedAt: new Date().toISOString(),
      });

      // Show success message with coins earned (awarded automatically by backend)
      if (response.coinsAwarded) {
        toast.success(
          `🎉 Course completed! You earned ${response.coinsAwarded} coins!`,
          { duration: 5000 }
        );
      } else {
        toast.success('Course completed successfully!');
      }

      // Refresh enrollments and wallet balance
      await Promise.all([
        fetchEnrollments(),
        // Optionally refresh wallet balance if needed
      ]);
    } catch (error: any) {
      console.error('Error completing course:', error);
      toast.error(error.response?.data?.message || 'Failed to complete course');
    } finally {
      setUpdating(null);
    }
  };

  const handleUpdateProgress = async (enrollment: TrainingEnrollment, newProgress: number) => {
    if (!enrollment.id) return;

    if (newProgress < 0 || newProgress > 100) {
      toast.error('Progress must be between 0 and 100');
      return;
    }

    try {
      setUpdating(enrollment.id);
      
      const status = newProgress === 100 ? 'COMPLETED' : newProgress > 0 ? 'IN_PROGRESS' : 'ENROLLED';
      
      await trainingApi.updateEnrollment(enrollment.id, {
        progress: newProgress,
        status: status,
        startedAt: newProgress > 0 && !enrollment.startedAt ? new Date().toISOString() : enrollment.startedAt,
        completedAt: newProgress === 100 ? new Date().toISOString() : undefined,
      });

      toast.success('Progress updated successfully');
      await fetchEnrollments();
    } catch (error: any) {
      console.error('Error updating progress:', error);
      toast.error(error.response?.data?.message || 'Failed to update progress');
    } finally {
      setUpdating(null);
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

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading your trainings...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">My Trainings</h1>
          <p className="text-gray-400">Track your progress and complete courses to earn coins</p>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="flex gap-4">
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
              <option value="ENROLLED">Enrolled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
            </select>
            <Link href="/dashboard/training">
              <Button variant="outline" size="md">
                Browse Courses
              </Button>
            </Link>
          </div>
        </div>

        {/* Enrollments List */}
        {enrollments.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-2xl font-bold text-white mb-2">No enrollments yet</h3>
            <p className="text-gray-400 mb-6">Start learning by enrolling in a course</p>
            <Link href="/dashboard/training">
              <Button variant="primary">Browse Courses</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {enrollments.map((enrollment) => {
                const statusColor = STATUS_COLORS[enrollment.status] || STATUS_COLORS.ENROLLED;
                const course = enrollment.course;

                return (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                  >
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Course Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-2xl font-bold text-white mb-2">
                              {course?.title || 'Course'}
                            </h3>
                            {course && (
                              <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
                                <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-400">
                                  {course.category}
                                </span>
                                <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                                  {course.mode}
                                </span>
                                <span className="px-2 py-1 rounded bg-teal-500/20 text-teal-400">
                                  {course ? formatDuration(course.duration) : 'N/A'}
                                </span>
                                <span
                                  className={`px-2 py-1 rounded-full font-medium border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                                >
                                  {enrollment.status.replace('_', ' ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-300">Progress</span>
                            <span className="text-sm font-bold text-white">{enrollment.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500"
                              style={{ width: `${enrollment.progress}%` }}
                            />
                          </div>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <span className="text-gray-400">Enrolled:</span>
                            <span className="text-white ml-2">{formatDate(enrollment.enrolledAt)}</span>
                          </div>
                          {enrollment.startedAt && (
                            <div>
                              <span className="text-gray-400">Started:</span>
                              <span className="text-white ml-2">{formatDate(enrollment.startedAt)}</span>
                            </div>
                          )}
                          {enrollment.completedAt && (
                            <div>
                              <span className="text-gray-400">Completed:</span>
                              <span className="text-white ml-2">{formatDate(enrollment.completedAt)}</span>
                            </div>
                          )}
                          {enrollment.practiceHours > 0 && (
                            <div>
                              <span className="text-gray-400">Practice Hours:</span>
                              <span className="text-white ml-2">{enrollment.practiceHours} hours</span>
                            </div>
                          )}
                          {enrollment.timeSpent !== undefined && enrollment.timeSpent > 0 && (
                            <div>
                              <span className="text-gray-400">Time Spent:</span>
                              <span className="text-white ml-2">
                                {enrollment.timeSpent >= 60 
                                  ? `${Math.floor(enrollment.timeSpent / 60)}h ${enrollment.timeSpent % 60}m`
                                  : `${enrollment.timeSpent}m`}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Coin Reward Display for Completed Courses */}
                        {enrollment.status === 'COMPLETED' && enrollment.course && (
                          <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30">
                            <div className="flex items-center gap-2 text-yellow-400">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="font-semibold">
                                🎉 Earned {Math.max(100, (enrollment.course.duration || 1) * 50)} coins for completion!
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                          {enrollment.status !== 'COMPLETED' && (
                            <>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={enrollment.progress}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value) || 0;
                                    handleUpdateProgress(enrollment, value);
                                  }}
                                  className="w-20"
                                  disabled={updating === enrollment.id}
                                />
                                <span className="text-gray-400 text-sm">%</span>
                              </div>
                              {enrollment.progress === 100 && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  onClick={() => handleCompleteCourse(enrollment)}
                                  disabled={updating === enrollment.id}
                                >
                                  {updating === enrollment.id ? 'Completing...' : 'Mark as Complete'}
                                </Button>
                              )}
                            </>
                          )}
                          {course && (
                            <Link href={`/dashboard/training/${course.id}`}>
                              <Button variant="outline" size="sm">
                                View Course
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function MyTrainingsPage() {
  return (
    <ProtectedRoute>
      <MyTrainingsContent />
    </ProtectedRoute>
  );
}

