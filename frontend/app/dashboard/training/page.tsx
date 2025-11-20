'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { trainingApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TrainingCourse } from '@/types/api';
import { truncateText, getCourseThumbnail } from '@/utils/htmlUtils';

const TRAINING_MODES = [
  { value: '', label: 'All Modes' },
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'Technical', label: 'Technical' },
  { value: 'Soft Skills', label: 'Soft Skills' },
  { value: 'Management', label: 'Management' },
  { value: 'Language', label: 'Language' },
  { value: 'Certification', label: 'Certification' },
];

function TrainingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    mode: searchParams.get('mode') || '',
    isActive: 'true',
  });
  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);
  const [showFilters, setShowFilters] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 12,
        isActive: filters.isActive === 'true',
      };

      if (filters.search) params.search = filters.search;
      if (filters.category) params.category = filters.category;
      if (filters.mode) params.mode = filters.mode;

      const response = await trainingApi.getCourses(params);
      setCourses((response.data || []) as TrainingCourse[]);
      setPagination(response.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load training courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [filters, currentPage]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCourses();
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

  if (loading && courses.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading training courses...</div>
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
          <h1 className="text-4xl font-bold text-white mb-2">Training Courses</h1>
          <p className="text-gray-400">Enhance your skills with our comprehensive training programs</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6">
          <form onSubmit={handleSearch} className="flex gap-4 mb-4">
            <Input
              type="text"
              placeholder="Search courses..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="flex-1"
            />
            <Button type="submit" variant="primary" size="md">
              Search
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
          </form>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border border-gray-800/50"
              style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)' }}
            >
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                  }}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Mode</label>
                <select
                  value={filters.mode}
                  onChange={(e) => handleFilterChange('mode', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                  }}
                >
                  {TRAINING_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
            </motion.div>
          )}
        </div>

        {/* Courses Grid */}
        {courses.length === 0 ? (
          <div className="text-center py-16">
            <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-2xl font-bold text-white mb-2">No courses found</h3>
            <p className="text-gray-400">Try adjusting your filters to see more results</p>
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
                    className="p-6 rounded-2xl border-2 backdrop-blur-xl hover:border-teal-500/50 transition-all cursor-pointer"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                    onClick={() => router.push(`/dashboard/training/${course.id}`)}
                  >
                    {/* Course Thumbnail */}
                    <div className="mb-4 rounded-lg overflow-hidden bg-gray-800/50">
                      {getCourseThumbnail(course.videoMaterials) ? (
                        <img
                          src={getCourseThumbnail(course.videoMaterials)!}
                          alt={course.title}
                          className="w-full h-48 object-cover"
                          onError={(e) => {
                            // Hide image and show placeholder on error
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const placeholder = target.nextElementSibling as HTMLElement;
                            if (placeholder) {
                              placeholder.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-full h-48 items-center justify-center bg-gradient-to-br from-teal-500/20 to-purple-500/20 ${getCourseThumbnail(course.videoMaterials) ? 'hidden' : 'flex'}`}
                      >
                        <svg className="w-16 h-16 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                    </div>

                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-xl font-bold text-white mb-1 hover:text-teal-400 transition-colors flex-1">
                        {course.title}
                      </h3>
                      {course.isVerified && (
                        <div className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 flex-shrink-0 ml-2">
                          <span className="text-green-400 text-xs font-semibold">Verified</span>
                        </div>
                      )}
                    </div>

                    <p className="text-gray-400 text-sm mb-4 line-clamp-2">{truncateText(course.description, 120)}</p>

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

                    <Button
                      variant="primary"
                      size="sm"
                      className="w-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/training/${course.id}`);
                      }}
                    >
                      View Details
                    </Button>
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

export default function TrainingPage() {
  return (
    <ProtectedRoute>
      <TrainingContent />
    </ProtectedRoute>
  );
}

