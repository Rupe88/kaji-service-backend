'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { trainingApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TrainingCourse } from '@/types/api';

function MyCoursesContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await trainingApi.getCourses({
        providerId: user.id,
        page: currentPage,
        limit: 12,
      });
      setCourses((response.data || []) as TrainingCourse[]);
      setPagination(response.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, currentPage]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(courseId);
      await trainingApi.delete(courseId);
      toast.success('Course deleted successfully');
      await fetchCourses();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(error.response?.data?.message || 'Failed to delete course');
    } finally {
      setDeleting(null);
    }
  };

  const formatPrice = (course: TrainingCourse) => {
    if (course.isFree) return 'Free';
    const price = typeof course.price === 'string' ? parseFloat(course.price) : course.price;
    return `Rs. ${price.toLocaleString()}`;
  };

  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours} hours`;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    if (remainingHours === 0) return `${days} day${days !== 1 ? 's' : ''}`;
    return `${days} day${days !== 1 ? 's' : ''} ${remainingHours} hour${remainingHours !== 1 ? 's' : ''}`;
  };

  const getSeatsAvailable = (course: TrainingCourse) => {
    if (!course.seats) return 'Unlimited';
    const available = course.seats - course.bookedSeats;
    return `${available} of ${course.seats} available`;
  };

  if (!user || user.role !== 'INDUSTRIAL') {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">This page is only available for training providers</p>
            <Link href="/dashboard">
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading && courses.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading your courses...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Training Courses</h1>
            <p className="text-gray-400">Manage your training courses and track enrollments</p>
          </div>
          <Link href="/dashboard/employer/training/create">
            <Button variant="primary" size="md">
              + Create Course
            </Button>
          </Link>
        </div>

        {/* Courses List */}
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-2xl font-bold text-white mb-2">No courses yet</h3>
            <p className="text-gray-400 mb-6">Create your first training course to get started</p>
            <Link href="/dashboard/employer/training/create">
              <Button variant="primary">Create Course</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              <AnimatePresence>
                {courses.map((course, index) => (
                  <motion.div
                    key={course.id}
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
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-white mb-1 flex-1">{course.title}</h3>
                      {course.isVerified && (
                        <div className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 flex-shrink-0 ml-2">
                          <span className="text-green-400 text-xs font-semibold">Verified</span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description.replace(/<[^>]*>/g, '').substring(0, 100)}...</p>

                    <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
                      <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-400">
                        {course.category}
                      </span>
                      <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-400">
                        {course.mode}
                      </span>
                      <span className="px-2 py-1 rounded bg-teal-500/20 text-teal-400">
                        {formatDuration(course.duration)}
                      </span>
                      <span className="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
                        {formatPrice(course)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                      <span>{getSeatsAvailable(course)}</span>
                      {course._count && course._count.enrollments > 0 && (
                        <span>{course._count.enrollments} enrolled</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        course.isActive 
                          ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {course.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 mt-4">
                      <Link href={`/dashboard/training/${course.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Course
                        </Button>
                      </Link>
                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/dashboard/employer/training/${course.id}/edit`)}
                          disabled={deleting === course.id}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(course.id)}
                          disabled={deleting === course.id}
                          className="text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50"
                        >
                          {deleting === course.id ? 'Deleting...' : 'Delete'}
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
                  Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} courses
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(pagination.pages, prev + 1))}
                    disabled={currentPage === pagination.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function MyCoursesPage() {
  return (
    <ProtectedRoute>
      <MyCoursesContent />
    </ProtectedRoute>
  );
}

