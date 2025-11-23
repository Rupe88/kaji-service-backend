'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { examsApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { ExamBooking } from '@/types/api';

interface ExamBookingWithDetails extends Omit<ExamBooking, 'exam'> {
  exam?: {
    id: string;
    title: string;
    category: string;
    mode: string;
    duration: number;
    totalMarks: number;
    passingScore: number;
  };
  individual?: {
    userId: string;
    fullName: string;
    email: string;
  };
}

function ExamBookingsManagementContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<ExamBookingWithDetails[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedBooking, setSelectedBooking] = useState<ExamBookingWithDetails | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [updateData, setUpdateData] = useState({
    status: '',
    score: '',
  });

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedStatus) {
        params.status = selectedStatus;
      }

      const response = await examsApi.getBookings(params);
      
      if (response.data) {
        setBookings(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching exam bookings:', error);
      toast.error('Failed to load exam bookings');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedStatus]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleUpdate = async () => {
    if (!selectedBooking) return;

    try {
      setUpdating(true);
      const updatePayload: any = {};
      
      if (updateData.status) {
        updatePayload.status = updateData.status;
      }
      
      if (updateData.score !== '') {
        const scoreNum = parseInt(updateData.score);
        if (isNaN(scoreNum) || scoreNum < 0) {
          toast.error('Please enter a valid score');
          return;
        }
        updatePayload.score = scoreNum;
      }

      if (Object.keys(updatePayload).length === 0) {
        toast.error('Please update at least one field');
        return;
      }

      await examsApi.updateBooking(selectedBooking.id, updatePayload);
      toast.success('Exam booking updated successfully!');
      setShowUpdateModal(false);
      setSelectedBooking(null);
      setUpdateData({ status: '', score: '' });
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update exam booking');
    } finally {
      setUpdating(false);
    }
  };

  const handleEdit = (booking: ExamBookingWithDetails) => {
    setSelectedBooking(booking);
    setUpdateData({
      status: booking.status || '',
      score: booking.score?.toString() || '',
    });
    setShowUpdateModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'FAILED':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'SCHEDULED':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'RETOTALING_REQUESTED':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'RETOTALING_COMPLETED':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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

  if (loading && bookings.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading exam bookings...</div>
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
            <h1 className="text-4xl font-bold text-white mb-2">Exam Bookings Management</h1>
            <p className="text-gray-400">View and manage all exam bookings</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="">All Statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="COMPLETED">Completed</option>
              <option value="PASSED">Passed</option>
              <option value="FAILED">Failed</option>
              <option value="RETOTALING_REQUESTED">Retotaling Requested</option>
              <option value="RETOTALING_COMPLETED">Retotaling Completed</option>
            </select>
          </div>

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No exam bookings found</p>
              <p className="text-gray-500 text-sm">Bookings will appear here when job seekers book exams</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {bookings.map((booking, index) => (
                  <motion.div
                    key={booking.id}
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
                            {booking.exam?.title || 'Unknown Exam'}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(booking.status)}`}>
                            {booking.status.replace('_', ' ')}
                          </span>
                          {booking.exam && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                              {booking.exam.category.replace('_', ' ')}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-gray-400 text-sm mb-1">Candidate</p>
                            <p className="text-white font-semibold">
                              {booking.individual?.fullName || 'Unknown User'}
                            </p>
                            <p className="text-gray-400 text-xs">{booking.individual?.email}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm mb-1">Exam Date</p>
                            <p className="text-white">{formatDate(booking.examDate?.toString())}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm mb-1">Booked Date</p>
                            <p className="text-white">{formatDate(booking.bookedDate?.toString())}</p>
                          </div>
                          {booking.score !== null && booking.score !== undefined && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Score</p>
                              <p className="text-white font-semibold">
                                {booking.score} / {booking.exam?.totalMarks || 'N/A'}
                                {booking.exam && (
                                  <span className="ml-2 text-sm text-gray-400">
                                    ({Math.round((booking.score / booking.exam.totalMarks) * 100)}%)
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          {booking.resultDate && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Result Date</p>
                              <p className="text-white">{formatDate(booking.resultDate.toString())}</p>
                            </div>
                          )}
                          {booking.exam && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Passing Score</p>
                              <p className="text-white">
                                {booking.exam.passingScore}% ({Math.round((booking.exam.passingScore / 100) * booking.exam.totalMarks)} marks)
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Evidence Links */}
                        {(booking.examVideos?.length > 0 || booking.examPhotos?.length > 0 || 
                          booking.interviewVideos?.length > 0 || booking.interviewPhotos?.length > 0) && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-gray-400 text-sm mb-2">Evidence:</p>
                            <div className="flex flex-wrap gap-2">
                              {booking.examVideos?.map((url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs hover:bg-blue-500/30"
                                >
                                  Exam Video {idx + 1}
                                </a>
                              ))}
                              {booking.examPhotos?.map((url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30"
                                >
                                  Exam Photo {idx + 1}
                                </a>
                              ))}
                              {booking.interviewVideos?.map((url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 text-xs hover:bg-purple-500/30"
                                >
                                  Interview Video {idx + 1}
                                </a>
                              ))}
                              {booking.interviewPhotos?.map((url: string, idx: number) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 rounded bg-pink-500/20 text-pink-400 text-xs hover:bg-pink-500/30"
                                >
                                  Interview Photo {idx + 1}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(booking)}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold transition-colors text-sm"
                        >
                          Update
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
      {showUpdateModal && selectedBooking && (
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
              <h2 className="text-2xl font-bold text-white">Update Exam Booking</h2>
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedBooking(null);
                  setUpdateData({ status: '', score: '' });
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
                <p className="text-gray-400 text-sm mb-2">Exam: {selectedBooking.exam?.title}</p>
                <p className="text-gray-400 text-sm mb-4">Candidate: {selectedBooking.individual?.fullName}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
                <select
                  value={updateData.status}
                  onChange={(e) => setUpdateData({ ...updateData, status: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="">Keep Current ({selectedBooking.status})</option>
                  <option value="SCHEDULED">Scheduled</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PASSED">Passed</option>
                  <option value="FAILED">Failed</option>
                  <option value="RETOTALING_REQUESTED">Retotaling Requested</option>
                  <option value="RETOTALING_COMPLETED">Retotaling Completed</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Score (out of {selectedBooking.exam?.totalMarks || 'N/A'})
                </label>
                <input
                  type="number"
                  value={updateData.score}
                  onChange={(e) => setUpdateData({ ...updateData, score: e.target.value })}
                  min="0"
                  max={selectedBooking.exam?.totalMarks || 10000}
                  placeholder={selectedBooking.score?.toString() || 'Enter score'}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
                {selectedBooking.exam && updateData.score && (
                  <p className="text-gray-400 text-xs mt-1">
                    Percentage: {Math.round((parseInt(updateData.score) / selectedBooking.exam.totalMarks) * 100)}%
                    {parseInt(updateData.score) >= (selectedBooking.exam.passingScore / 100) * selectedBooking.exam.totalMarks ? (
                      <span className="text-green-400 ml-2">✓ Passing</span>
                    ) : (
                      <span className="text-red-400 ml-2">✗ Failing</span>
                    )}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowUpdateModal(false);
                  setSelectedBooking(null);
                  setUpdateData({ status: '', score: '' });
                }}
                className="px-6 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={updating}
                className="px-6 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Booking'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ExamBookingsManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <ExamBookingsManagementContent />
    </ProtectedRoute>
  );
}

