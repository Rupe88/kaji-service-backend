'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { trainingApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TrainingEnrollment, TrainingCourse } from '@/types/api';

function TrainingEnrollmentsManagementContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<TrainingEnrollment | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    progress: 0,
    status: 'ENROLLED' as 'ENROLLED' | 'IN_PROGRESS' | 'COMPLETED' | 'DROPPED',
    practiceHours: 0,
  });

  // Fetch all courses for filter dropdown
  const fetchCourses = useCallback(async () => {
    try {
      const response = await trainingApi.getCourses({ limit: 1000 });
      if (response.data) {
        setCourses(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error fetching courses:', error);
    }
  }, []);

  const fetchEnrollments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedCourseId) params.courseId = selectedCourseId;
      if (selectedStatus) params.status = selectedStatus;
      if (searchQuery) params.userId = searchQuery; // Search by user ID

      const response = await trainingApi.getEnrollments(params);
      
      if (response.data) {
        setEnrollments(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching enrollments:', error);
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedCourseId, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleEdit = (enrollment: TrainingEnrollment) => {
    setEditingEnrollment(enrollment);
    setFormData({
      progress: enrollment.progress,
      status: enrollment.status,
      practiceHours: enrollment.practiceHours,
    });
    setShowUpdateModal(true);
  };

  const handleUpdate = async () => {
    if (!editingEnrollment) return;

    try {
      const result = await trainingApi.updateEnrollment(editingEnrollment.id, formData);
      toast.success('Enrollment updated successfully!');
      if (result.coinsAwarded) {
        toast.success(`🎉 ${result.coinsAwarded} coins awarded for course completion!`);
      }
      setShowUpdateModal(false);
      setEditingEnrollment(null);
      fetchEnrollments();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update enrollment');
    }
  };

  const handleExport = async () => {
    try {
      const csvData = enrollments.map(enrollment => ({
        'Enrollment ID': enrollment.id,
        'Course Title': enrollment.course?.title || 'N/A',
        'User Name': enrollment.individual?.fullName || 'N/A',
        'User Email': enrollment.individual?.email || 'N/A',
        'Status': enrollment.status,
        'Progress': `${enrollment.progress}%`,
        'Practice Hours': enrollment.practiceHours,
        'Enrolled At': new Date(enrollment.enrolledAt).toLocaleString(),
        'Started At': enrollment.startedAt ? new Date(enrollment.startedAt).toLocaleString() : 'N/A',
        'Completed At': enrollment.completedAt ? new Date(enrollment.completedAt).toLocaleString() : 'N/A',
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `training-enrollments-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Enrollments exported successfully!');
    } catch (error: any) {
      toast.error('Failed to export enrollments');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500/20 text-green-400';
      case 'IN_PROGRESS':
        return 'bg-blue-500/20 text-blue-400';
      case 'DROPPED':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  if (loading && enrollments.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading enrollments...</div>
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
            <Link href="/dashboard/admin/training">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Training Courses</span>
              </motion.button>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">Training Enrollments Management</h1>
                <p className="text-gray-400">View and manage all training enrollments across all courses</p>
              </div>
              {enrollments.length > 0 && (
                <button
                  onClick={handleExport}
                  className="px-6 py-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Export CSV
                </button>
              )}
            </div>
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
              placeholder="Search by User ID..."
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400 flex-1 min-w-[200px]"
            />
            <select
              value={selectedCourseId}
              onChange={(e) => {
                setSelectedCourseId(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
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
              <option value="ENROLLED">Enrolled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DROPPED">Dropped</option>
            </select>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <p className="text-sm text-gray-400 mb-1">Total Enrollments</p>
              <p className="text-2xl font-bold text-white">{pagination.total}</p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <p className="text-sm text-gray-400 mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-400">
                {enrollments.filter(e => e.status === 'COMPLETED').length}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-4 rounded-xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <p className="text-sm text-gray-400 mb-1">In Progress</p>
              <p className="text-2xl font-bold text-blue-400">
                {enrollments.filter(e => e.status === 'IN_PROGRESS').length}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-4 rounded-xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <p className="text-sm text-gray-400 mb-1">Avg Progress</p>
              <p className="text-2xl font-bold text-teal-400">
                {enrollments.length > 0
                  ? Math.round(enrollments.reduce((sum, e) => sum + e.progress, 0) / enrollments.length)
                  : 0}%
              </p>
            </motion.div>
          </div>

          {/* Enrollments List */}
          {enrollments.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No enrollments found</p>
              <p className="text-gray-500 text-sm">Enrollments will appear here when users enroll in courses</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {enrollments.map((enrollment, index) => (
                  <motion.div
                    key={enrollment.id}
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
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">
                            {enrollment.individual?.fullName || 'Unknown User'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(enrollment.status)}`}>
                            {enrollment.status.replace('_', ' ')}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                            {enrollment.course?.title || 'Unknown Course'}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">{enrollment.individual?.email || 'N/A'}</p>
                        
                        {/* Progress Bar */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-400">Progress</span>
                            <span className="text-sm font-semibold text-white">{enrollment.progress}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-gray-800">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${enrollment.progress}%`,
                                backgroundColor: enrollment.progress === 100 ? '#10b981' : '#14b8a6',
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Practice Hours</p>
                            <p className="text-white font-semibold">{enrollment.practiceHours} hrs</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Enrolled At</p>
                            <p className="text-white font-semibold">{formatDate(enrollment.enrolledAt)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Started At</p>
                            <p className="text-white font-semibold">{formatDate(enrollment.startedAt)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Completed At</p>
                            <p className="text-white font-semibold">{formatDate(enrollment.completedAt)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        {enrollment.course && (
                          <Link href={`/dashboard/training/${enrollment.course.id}`}>
                            <button className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold transition-colors text-sm whitespace-nowrap">
                              View Course
                            </button>
                          </Link>
                        )}
                        <button
                          onClick={() => handleEdit(enrollment)}
                          className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors text-sm"
                        >
                          Update Progress
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

      {/* Update Modal */}
      {showUpdateModal && editingEnrollment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.9)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Update Enrollment</h2>
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setEditingEnrollment(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">User</label>
                <p className="text-white">
                  {editingEnrollment.individual?.fullName || 'Unknown'} ({editingEnrollment.individual?.email || 'N/A'})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Course</label>
                <p className="text-white">{editingEnrollment.course?.title || 'Unknown Course'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Progress (%) *</label>
                <input
                  type="number"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })}
                  min="0"
                  max="100"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
                <div className="mt-2 w-full h-2 rounded-full bg-gray-800">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{
                      width: `${formData.progress}%`,
                      backgroundColor: formData.progress === 100 ? '#10b981' : '#14b8a6',
                    }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="ENROLLED">Enrolled</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="DROPPED">Dropped</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Practice Hours</label>
                <input
                  type="number"
                  value={formData.practiceHours}
                  onChange={(e) => setFormData({ ...formData, practiceHours: Math.max(0, parseFloat(e.target.value) || 0) })}
                  min="0"
                  step="0.5"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setEditingEnrollment(null);
                }}
                className="px-6 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                className="px-6 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
              >
                Update Enrollment
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function TrainingEnrollmentsManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <TrainingEnrollmentsManagementContent />
    </ProtectedRoute>
  );
}

