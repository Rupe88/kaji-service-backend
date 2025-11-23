'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { trainingApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TrainingCourse, TrainingMode } from '@/types/api';

function TrainingCoursesManagementContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<TrainingCourse | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    mode: 'ONLINE' as TrainingMode,
    duration: 0,
    price: '',
    isFree: true,
    isActive: true,
    isVerified: false,
    seats: '',
    startDate: '',
    endDate: '',
  });

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedCategory) params.category = selectedCategory;
      if (selectedMode) params.mode = selectedMode;
      if (selectedStatus !== '') params.isActive = selectedStatus === 'active';
      if (searchQuery) params.search = searchQuery;

      const response = await trainingApi.getCourses(params);
      
      if (response.data) {
        setCourses(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedCategory, selectedMode, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleEdit = (course: TrainingCourse) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description,
      category: course.category,
      mode: course.mode,
      duration: course.duration,
      price: typeof course.price === 'string' ? course.price : (course.price?.toString() || ''),
      isFree: course.isFree,
      isActive: course.isActive,
      isVerified: course.isVerified || false,
      seats: course.seats?.toString() || '',
      startDate: course.startDate ? new Date(course.startDate).toISOString().slice(0, 10) : '',
      endDate: course.endDate ? new Date(course.endDate).toISOString().slice(0, 10) : '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingCourse) return;

    try {
      if (!formData.title || !formData.description || !formData.category) {
        toast.error('Please fill in all required fields');
        return;
      }

      const courseData: any = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        mode: formData.mode,
        duration: formData.duration,
        isFree: formData.isFree,
        isActive: formData.isActive,
        isVerified: formData.isVerified,
      };

      if (!formData.isFree && formData.price) {
        courseData.price = parseFloat(formData.price);
      }

      if (formData.seats) {
        courseData.seats = parseInt(formData.seats);
      }

      if (formData.startDate) {
        courseData.startDate = new Date(formData.startDate).toISOString();
      }

      if (formData.endDate) {
        courseData.endDate = new Date(formData.endDate).toISOString();
      }

      await trainingApi.update(editingCourse.id, courseData);
      toast.success('Course updated successfully!');
      setShowEditModal(false);
      setEditingCourse(null);
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update course');
    }
  };

  const handleDelete = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      return;
    }

    try {
      await trainingApi.delete(courseId);
      toast.success('Course deleted successfully!');
      fetchCourses();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading && courses.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading courses...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Training Courses Management</h1>
            <p className="text-gray-400">Manage all training courses from all providers</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4 flex-wrap">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              placeholder="Search courses..."
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400 flex-1 min-w-[200px]"
            />
            <select
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="">All Categories</option>
              <option value="TECHNICAL">Technical</option>
              <option value="SOFT_SKILLS">Soft Skills</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="CERTIFICATION">Certification</option>
            </select>
            <select
              value={selectedMode}
              onChange={(e) => {
                setSelectedMode(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="">All Modes</option>
              <option value="ONLINE">Online</option>
              <option value="PHYSICAL">Physical</option>
              <option value="HYBRID">Hybrid</option>
            </select>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Courses List */}
          {courses.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No courses found</p>
              <p className="text-gray-500 text-sm">Courses will appear here when created by providers</p>
            </div>
          ) : (
            <div className="space-y-4">
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
                      borderColor: course.isActive 
                        ? 'oklch(0.7 0.15 180 / 0.3)' 
                        : 'oklch(0.5 0 0 / 0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">{course.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            course.isActive 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {course.isActive ? 'Active' : 'Inactive'}
                          </span>
                          {course.isVerified && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                              Verified
                            </span>
                          )}
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                            {course.category}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/20 text-teal-400">
                            {course.mode}
                          </span>
                          {course.isFree ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                              Free
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                              Rs. {typeof course.price === 'string' ? parseFloat(course.price) : course.price || 0}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{course.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Duration</p>
                            <p className="text-white font-semibold">{course.duration} hours</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Enrollments</p>
                            <p className="text-white font-semibold">
                              {course._count?.enrollments || 0}
                              {course.seats && ` / ${course.seats}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Start Date</p>
                            <p className="text-white font-semibold">{formatDate(course.startDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Provider ID</p>
                            <p className="text-white font-mono text-xs">{course.providerId}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Link href={`/dashboard/training/${course.id}`}>
                          <button className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold transition-colors text-sm whitespace-nowrap">
                            View Course
                          </button>
                        </Link>
                        <button
                          onClick={() => handleEdit(course)}
                          className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(course.id)}
                          className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-colors text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editingCourse && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl p-6 rounded-2xl border-2 backdrop-blur-xl max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.9)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Course</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCourse(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="">Select Category</option>
                    <option value="TECHNICAL">Technical</option>
                    <option value="SOFT_SKILLS">Soft Skills</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="CERTIFICATION">Certification</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Mode *</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as TrainingMode })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="PHYSICAL">Physical</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Duration (hours) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    min="1"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Seats (optional)</label>
                  <input
                    type="number"
                    value={formData.seats}
                    onChange={(e) => setFormData({ ...formData, seats: e.target.value })}
                    min="1"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={formData.isFree}
                  onChange={(e) => setFormData({ ...formData, isFree: e.target.checked, price: e.target.checked ? '' : formData.price })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-teal-400 focus:ring-teal-400"
                />
                <label htmlFor="isFree" className="text-sm text-gray-400">
                  Free Course
                </label>
              </div>

              {!formData.isFree && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Price (Rs.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-teal-400 focus:ring-teal-400"
                />
                <label htmlFor="isActive" className="text-sm text-gray-400">
                  Active (visible to users)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVerified"
                  checked={formData.isVerified}
                  onChange={(e) => setFormData({ ...formData, isVerified: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-teal-400 focus:ring-teal-400"
                />
                <label htmlFor="isVerified" className="text-sm text-gray-400">
                  Verified (approved by admin)
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingCourse(null);
                }}
                className="px-6 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-6 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
              >
                Update Course
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function TrainingCoursesManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <TrainingCoursesManagementContent />
    </ProtectedRoute>
  );
}

