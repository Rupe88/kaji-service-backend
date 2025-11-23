'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { examsApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
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
}

function MyExamBookingsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<ExamBookingWithDetails[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<ExamBookingWithDetails | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showRetotalingModal, setShowRetotalingModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [fileType, setFileType] = useState<'exam' | 'interview'>('exam');
  const [fileCategory, setFileCategory] = useState<'video' | 'photo'>('photo');

  useEffect(() => {
    if (user?.id) {
      fetchBookings();
    }
  }, [user?.id]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await examsApi.getBookings({ userId: user?.id });
      
      if (response.data) {
        setBookings(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      console.error('Error fetching exam bookings:', error);
      if (error.response?.status !== 404) {
        toast.error('Failed to load exam bookings');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleUpload = async () => {
    if (!selectedBooking || selectedFiles.length === 0) {
      toast.error('Please select files to upload');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });

      // Get existing media URLs
      const existingVideos = fileType === 'exam' 
        ? (selectedBooking.examVideos || [])
        : (selectedBooking.interviewVideos || []);
      const existingPhotos = fileType === 'exam'
        ? (selectedBooking.examPhotos || [])
        : (selectedBooking.interviewPhotos || []);

      // We'll need to upload files first, then update booking
      // For now, we'll use the updateBooking API which handles file uploads
      await examsApi.updateBooking(selectedBooking.id, formData);
      
      toast.success('Files uploaded successfully!');
      setShowUploadModal(false);
      setSelectedFiles([]);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleRequestRetotaling = async () => {
    if (!selectedBooking) return;

    try {
      await examsApi.requestRetotaling(selectedBooking.id);
      toast.success('Retotaling request submitted successfully!');
      setShowRetotalingModal(false);
      setSelectedBooking(null);
      fetchBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request retotaling');
    }
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

  const canUploadEvidence = (booking: ExamBookingWithDetails) => {
    return booking.status === 'SCHEDULED' || booking.status === 'COMPLETED';
  };

  const canRequestRetotaling = (booking: ExamBookingWithDetails) => {
    return booking.status === 'FAILED' && !booking.retotalingRequested;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading your exam bookings...</div>
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">My Exam Bookings</h1>
              <p className="text-gray-400">View and manage your exam bookings</p>
            </div>
            <Link
              href="/dashboard/exams"
              className="px-6 py-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
            >
              Browse Exams
            </Link>
          </div>

          {/* Bookings List */}
          {bookings.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No exam bookings yet</p>
              <p className="text-gray-500 text-sm mb-4">Book an exam to get started</p>
              <Link
                href="/dashboard/exams"
                className="px-6 py-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors inline-block"
              >
                Browse Available Exams
              </Link>
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
                            <p className="text-gray-400 text-sm mb-1">Exam Date</p>
                            <p className="text-white">{formatDate(booking.examDate?.toString())}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 text-sm mb-1">Booked Date</p>
                            <p className="text-white">{formatDate(booking.bookedDate?.toString())}</p>
                          </div>
                          {booking.score !== null && booking.score !== undefined && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Your Score</p>
                              <p className="text-white font-semibold text-lg">
                                {booking.score} / {booking.exam?.totalMarks || 'N/A'}
                                {booking.exam && (
                                  <span className={`ml-2 text-sm ${
                                    booking.score >= (booking.exam.passingScore / 100) * booking.exam.totalMarks
                                      ? 'text-green-400'
                                      : 'text-red-400'
                                  }`}>
                                    ({Math.round((booking.score / booking.exam.totalMarks) * 100)}%)
                                  </span>
                                )}
                              </p>
                            </div>
                          )}
                          {booking.exam && booking.score !== null && booking.score !== undefined && (
                            <div>
                              <p className="text-gray-400 text-sm mb-1">Passing Score</p>
                              <p className="text-white">
                                {booking.exam.passingScore}% ({Math.round((booking.exam.passingScore / 100) * booking.exam.totalMarks)} marks)
                              </p>
                              {booking.score >= (booking.exam.passingScore / 100) * booking.exam.totalMarks ? (
                                <p className="text-green-400 text-sm mt-1">✓ You passed!</p>
                              ) : (
                                <p className="text-red-400 text-sm mt-1">✗ You did not pass</p>
                              )}
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
                              <p className="text-gray-400 text-sm mb-1">Duration</p>
                              <p className="text-white">{booking.exam.duration} minutes</p>
                            </div>
                          )}
                        </div>

                        {/* Evidence Links */}
                        {(booking.examVideos?.length > 0 || booking.examPhotos?.length > 0 || 
                          booking.interviewVideos?.length > 0 || booking.interviewPhotos?.length > 0) && (
                          <div className="mt-4 pt-4 border-t border-gray-700">
                            <p className="text-gray-400 text-sm mb-2">Your Uploaded Evidence:</p>
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
                      <div className="flex flex-col items-end gap-2 ml-4">
                        {canUploadEvidence(booking) && (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowUploadModal(true);
                            }}
                            className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold transition-colors text-sm whitespace-nowrap"
                          >
                            Upload Evidence
                          </button>
                        )}
                        {canRequestRetotaling(booking) && (
                          <button
                            onClick={() => {
                              setSelectedBooking(booking);
                              setShowRetotalingModal(true);
                            }}
                            className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors text-sm whitespace-nowrap"
                          >
                            Request Retotaling
                          </button>
                        )}
                        {booking.retotalingRequested && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                            Retotaling Requested
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Upload Evidence Modal */}
      {showUploadModal && selectedBooking && (
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
              <h2 className="text-2xl font-bold text-white">Upload Exam Evidence</h2>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedBooking(null);
                  setSelectedFiles([]);
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Evidence Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as 'exam' | 'interview')}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="exam">Exam Evidence</option>
                  <option value="interview">Interview Evidence</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">File Type</label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value as 'video' | 'photo')}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                >
                  <option value="photo">Photos</option>
                  <option value="video">Videos</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Select Files</label>
                <input
                  type="file"
                  multiple
                  accept={fileCategory === 'video' ? 'video/*' : 'image/*'}
                  onChange={handleFileSelect}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
                {selectedFiles.length > 0 && (
                  <p className="text-gray-400 text-xs mt-2">
                    {selectedFiles.length} file(s) selected
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-blue-400 text-sm">
                  <strong>Note:</strong> Upload photos or videos as proof of exam completion. 
                  Accepted formats: {fileCategory === 'video' ? 'MP4, MOV, AVI' : 'JPG, PNG, GIF'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setSelectedBooking(null);
                  setSelectedFiles([]);
                }}
                className="px-6 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || selectedFiles.length === 0}
                className="px-6 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Upload Files'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Request Retotaling Modal */}
      {showRetotalingModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.9)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Request Retotaling</h2>
              <button
                onClick={() => {
                  setShowRetotalingModal(false);
                  setSelectedBooking(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <p className="text-gray-400">
                Are you sure you want to request a retotaling (score review) for:
              </p>
              <p className="text-white font-semibold">{selectedBooking.exam?.title}</p>
              {selectedBooking.score !== null && selectedBooking.score !== undefined && (
                <p className="text-gray-400 text-sm">
                  Current Score: {selectedBooking.score} / {selectedBooking.exam?.totalMarks}
                </p>
              )}
              <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-yellow-400 text-sm">
                  <strong>Note:</strong> Your request will be reviewed by an administrator. 
                  You will be notified once the review is complete.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowRetotalingModal(false);
                  setSelectedBooking(null);
                }}
                className="px-6 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRetotaling}
                className="px-6 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors"
              >
                Request Retotaling
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function MyExamBookingsPage() {
  return (
    <ProtectedRoute requiredRole="INDIVIDUAL">
      <MyExamBookingsContent />
    </ProtectedRoute>
  );
}

