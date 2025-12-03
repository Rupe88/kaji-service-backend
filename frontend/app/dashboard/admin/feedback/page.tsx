'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { feedbackApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Feedback {
  id: string;
  type: string;
  category: string;
  title: string;
  description: string;
  rating?: number;
  status: string;
  adminNotes?: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
}

export default function AdminFeedbackPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AdminFeedbackContent />
    </ProtectedRoute>
  );
}

function AdminFeedbackContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'PENDING' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('ALL');
  const [selectedType, setSelectedType] = useState<'ALL' | 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL_FEEDBACK' | 'COMPLAINT' | 'SUGGESTION'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'UI_UX' | 'FUNCTIONALITY' | 'PERFORMANCE' | 'SECURITY' | 'CONTENT' | 'OTHER'>('ALL');
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [status, setStatus] = useState<'PENDING' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED'>('PENDING');
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchFeedbacks();
    }
  }, [user?.role, selectedStatus, selectedType, selectedCategory, pagination.page]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (selectedType !== 'ALL') params.type = selectedType;
      if (selectedCategory !== 'ALL') params.category = selectedCategory;

      const response = await feedbackApi.getAll(params);
      setFeedbacks(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedFeedback) return;

    try {
      setUpdating(true);
      await feedbackApi.updateStatus(selectedFeedback.id, {
        status,
        adminNotes: adminNotes || undefined,
      });

      toast.success('Feedback status updated successfully');
      setShowModal(false);
      setSelectedFeedback(null);
      setAdminNotes('');
      fetchFeedbacks();
    } catch (error: any) {
      console.error('Error updating feedback status:', error);
      toast.error(error.response?.data?.message || 'Failed to update feedback status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'RESOLVED':
        return { bg: 'oklch(0.7 0.15 150 / 0.2)', text: 'oklch(0.7 0.15 150)' };
      case 'IN_PROGRESS':
        return { bg: 'oklch(0.7 0.15 240 / 0.2)', text: 'oklch(0.7 0.15 240)' };
      case 'REVIEWED':
        return { bg: 'oklch(0.7 0.15 180 / 0.2)', text: 'oklch(0.7 0.15 180)' };
      case 'REJECTED':
        return { bg: 'oklch(0.65 0.2 330 / 0.2)', text: 'oklch(0.65 0.2 330)' };
      default:
        return { bg: 'oklch(0.8 0.15 60 / 0.2)', text: 'oklch(0.8 0.15 60)' };
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'BUG_REPORT':
        return { bg: 'oklch(0.65 0.2 330 / 0.2)', text: 'oklch(0.65 0.2 330)' };
      case 'FEATURE_REQUEST':
        return { bg: 'oklch(0.7 0.15 240 / 0.2)', text: 'oklch(0.7 0.15 240)' };
      case 'SUGGESTION':
        return { bg: 'oklch(0.7 0.15 180 / 0.2)', text: 'oklch(0.7 0.15 180)' };
      case 'COMPLAINT':
        return { bg: 'oklch(0.65 0.2 330 / 0.2)', text: 'oklch(0.65 0.2 330)' };
      default:
        return { bg: 'oklch(0.7 0.15 150 / 0.2)', text: 'oklch(0.7 0.15 150)' };
    }
  };

  if (loading && feedbacks.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading feedback...</div>
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
            <Link href="/dashboard/admin">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Dashboard</span>
              </motion.button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">User Feedback Management</h1>
              <p className="text-gray-400">Review and manage all user feedback</p>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex items-center gap-4 flex-wrap">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as any);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                <option value="ALL">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value as any);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                <option value="ALL">All Types</option>
                <option value="BUG_REPORT">Bug Report</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="GENERAL_FEEDBACK">General Feedback</option>
                <option value="SUGGESTION">Suggestion</option>
                <option value="COMPLAINT">Complaint</option>
              </select>

              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value as any);
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="UI_UX">UI/UX</option>
                <option value="FUNCTIONALITY">Functionality</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="SECURITY">Security</option>
                <option value="CONTENT">Content</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="text-sm text-gray-400">
              {feedbacks.length} {selectedStatus === 'ALL' ? '' : selectedStatus.toLowerCase()} feedback{feedbacks.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Feedback List */}
          {feedbacks.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-2xl font-bold text-white mb-2">No Feedback Found</h3>
              <p className="text-gray-400">No feedback matches your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {feedbacks.map((feedback) => {
                  const statusColor = getStatusColor(feedback.status);
                  const typeColor = getTypeColor(feedback.type);
                  return (
                    <motion.div
                      key={feedback.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                      }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          {feedback.user.profileImage ? (
                            <img
                              src={feedback.user.profileImage}
                              alt={feedback.user.firstName || feedback.user.email}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-bold">
                              {(feedback.user.firstName?.[0] || feedback.user.email[0]).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h3 className="text-xl font-bold text-white">{feedback.title}</h3>
                              <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: typeColor.bg, color: typeColor.text }}>
                                {feedback.type.replace('_', ' ')}
                              </span>
                              <span className="px-3 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: statusColor.bg, color: statusColor.text }}>
                                {feedback.status}
                              </span>
                              {feedback.rating && (
                                <span className="text-yellow-400 text-sm">
                                  {'⭐'.repeat(feedback.rating)}
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 mb-1">{feedback.user.email}</p>
                            <p className="text-gray-400 text-sm mb-2">{feedback.user.firstName} {feedback.user.lastName}</p>
                            <p className="text-gray-300 text-sm line-clamp-2">{feedback.description}</p>
                            <p className="text-gray-500 text-xs mt-2">
                              {new Date(feedback.createdAt).toLocaleDateString()} • {feedback.category}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              setSelectedFeedback(feedback);
                              setStatus(feedback.status as any);
                              setAdminNotes(feedback.adminNotes || '');
                              setShowModal(true);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                            style={{
                              backgroundColor: 'oklch(0.7 0.15 180 / 0.3)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 180 / 0.5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 180 / 0.3)';
                            }}
                          >
                            Update Status
                          </button>
                        </div>
                      </div>
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
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: pagination.page === 1 ? 'oklch(0.1 0 0 / 0.5)' : 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                Previous
              </button>
              <span className="text-gray-400 text-sm">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: pagination.page === pagination.pages ? 'oklch(0.1 0 0 / 0.5)' : 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <AnimatePresence>
        {showModal && selectedFeedback && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex flex-col rounded-2xl border-2 overflow-hidden max-w-2xl mx-auto"
              style={{
                backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="p-6 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                <h2 className="text-2xl font-bold text-white">Update Feedback Status</h2>
                <p className="text-gray-400 mt-1">{selectedFeedback.title}</p>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Status <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="REVIEWED">Reviewed</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="REJECTED">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add internal notes or response..."
                      rows={4}
                      className="w-full px-4 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 border-t-2 flex items-center justify-end gap-3" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedFeedback(null);
                    setAdminNotes('');
                  }}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

