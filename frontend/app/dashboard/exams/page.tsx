'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { examsApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { Exam, ExamBooking, ExamBookingRequest } from '@/types/api';

function ExamsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [myBookings, setMyBookings] = useState<ExamBooking[]>([]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const response = await examsApi.list({
        page: pagination.page,
        limit: pagination.limit,
        category: selectedCategory || undefined,
      });
      
      if (response.data) {
        setExams(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const response = await examsApi.getBookings({ userId: user?.id });
      if (response.data) {
        setMyBookings(Array.isArray(response.data) ? response.data : []);
      }
    } catch (error: any) {
      // 404 is expected if no bookings
      if (error.response?.status !== 404) {
        console.error('Error fetching bookings:', error);
      }
    }
  };

  useEffect(() => {
    fetchExams();
    if (user?.id) {
      fetchMyBookings();
    }
  }, [pagination.page, selectedCategory, user?.id]);

  const handleBook = async (examId: string) => {
    if (!user?.id) {
      toast.error('Please login to book exams');
      return;
    }
    try {
      const bookingData: ExamBookingRequest = { examId, userId: user.id };
      await examsApi.book(bookingData);
      toast.success('Successfully booked exam!');
      fetchExams();
      fetchMyBookings();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to book exam');
    }
  };

  const isBooked = (examId: string) => {
    return myBookings.some(booking => booking.examId === examId);
  };

  if (loading && exams.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading exams...</div>
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
              <h1 className="text-4xl font-bold text-white mb-2">Exams</h1>
              <p className="text-gray-400">Book and take skill validation exams</p>
            </div>
            {myBookings.length > 0 && (
              <Link href="/dashboard/exams/my-bookings">
                <button className="px-4 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  My Bookings ({myBookings.length})
                </button>
              </Link>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
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
              <option value="CERTIFICATION">Certification</option>
              <option value="LANGUAGE">Language</option>
            </select>
          </div>

          {/* Exams Grid */}
          {exams.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No exams found</p>
              <p className="text-gray-500 text-sm">Check back later for available exams</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AnimatePresence>
                {exams.map((exam, index) => {
                  const booked = isBooked(exam.id);
                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                        borderColor: exam.isActive 
                          ? booked
                            ? 'oklch(0.7 0.15 180 / 0.5)'
                            : 'oklch(0.7 0.15 180 / 0.3)' 
                          : 'oklch(0.5 0 0 / 0.3)',
                      }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2">{exam.title}</h3>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-purple-500/20 text-purple-400">
                              {exam.category.replace('_', ' ')}
                            </span>
                            {booked && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-teal-500/20 text-teal-400">
                                Booked
                              </span>
                            )}
                            {!exam.isActive && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-500/20 text-gray-400">
                                Inactive
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-400 text-sm mb-4 line-clamp-3">{exam.description}</p>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Duration</span>
                          <span className="text-white">{exam.duration} minutes</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Questions</span>
                          <span className="text-white">{exam.totalQuestions || exam.totalMarks}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Passing Score</span>
                          <span className="text-white">{exam.passingScore}%</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Fee</span>
                          <span className="text-white font-semibold">
                            ${typeof exam.examFee === 'string' ? parseFloat(exam.examFee) : exam.examFee || exam.fee || 0}
                          </span>
                        </div>
                        {exam.examDate && (
                          <div className="flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-gray-400">Exam Date:</span>
                            <span className="text-white">
                              {new Date(exam.examDate).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {exam.isActive && (
                        <button
                          onClick={() => handleBook(exam.id)}
                          disabled={booked}
                          className={`w-full px-4 py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                            booked
                              ? 'bg-teal-500/40 text-teal-300 cursor-not-allowed border-2 border-teal-500/50'
                              : 'bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 hover:scale-105 active:scale-95'
                          }`}
                        >
                          {booked ? (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Already Booked
                            </>
                          ) : (
                            <>
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              Book Exam
                            </>
                          )}
                        </button>
                      )}
                    </motion.div>
                  );
                })}
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
    </DashboardLayout>
  );
}

export default function ExamsPage() {
  return (
    <ProtectedRoute>
      <ExamsContent />
    </ProtectedRoute>
  );
}

