'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { examsApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { Exam } from '@/types/api';

function ExamsManagementContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    mode: 'ONLINE' as 'PHYSICAL' | 'ONLINE' | 'HYBRID',
    duration: 60,
    passingScore: 70,
    totalMarks: 100,
    examFee: 0,
    isActive: true,
  });

  const fetchExams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await examsApi.list({
        page: pagination.page,
        limit: pagination.limit,
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
  }, [pagination.page, pagination.limit]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.description || !formData.category) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (editingExam) {
        // Update existing exam
        await examsApi.update(editingExam.id, formData);
        toast.success('Exam updated successfully!');
      } else {
        // Create new exam
        await examsApi.create(formData);
        toast.success('Exam created successfully!');
      }

      setShowCreateModal(false);
      setEditingExam(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        mode: 'ONLINE',
        duration: 60,
        passingScore: 70,
        totalMarks: 100,
        examFee: 0,
        isActive: true,
      });
      fetchExams();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save exam');
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      title: exam.title,
      description: exam.description,
      category: exam.category,
      mode: exam.mode,
      duration: exam.duration,
      passingScore: exam.passingScore,
      totalMarks: exam.totalMarks,
      examFee: typeof exam.examFee === 'string' ? parseFloat(exam.examFee) : exam.examFee || 0,
      isActive: exam.isActive,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (examId: string) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      return;
    }

    try {
      await examsApi.delete(examId);
      toast.success('Exam deleted successfully!');
      fetchExams();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete exam');
    }
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
              <h1 className="text-4xl font-bold text-white mb-2">Exam Management</h1>
              <p className="text-gray-400">Create and manage skill validation exams</p>
            </div>
            <button
              onClick={() => {
                setEditingExam(null);
                setFormData({
                  title: '',
                  description: '',
                  category: '',
                  mode: 'ONLINE',
                  duration: 60,
                  passingScore: 70,
                  totalMarks: 100,
                  examFee: 0,
                  isActive: true,
                });
                setShowCreateModal(true);
              }}
              className="px-6 py-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Exam
            </button>
          </div>

          {/* Exams List */}
          {exams.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No exams found</p>
              <p className="text-gray-500 text-sm mb-4">Create your first exam to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
              >
                Create Exam
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {exams.map((exam, index) => (
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
                        ? 'oklch(0.7 0.15 180 / 0.3)' 
                        : 'oklch(0.5 0 0 / 0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">{exam.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            exam.isActive 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {exam.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                            {exam.category.replace('_', ' ')}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                            {exam.mode}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{exam.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Duration</p>
                            <p className="text-white font-semibold">{exam.duration} min</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Total Marks</p>
                            <p className="text-white font-semibold">{exam.totalMarks}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Passing Score</p>
                            <p className="text-white font-semibold">{exam.passingScore}%</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Fee</p>
                            <p className="text-white font-semibold">
                              ${typeof exam.examFee === 'string' ? parseFloat(exam.examFee) : exam.examFee || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(exam)}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
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
              <h2 className="text-2xl font-bold text-white">
                {editingExam ? 'Edit Exam' : 'Create New Exam'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingExam(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  placeholder="e.g., Flutter Developer Certification"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  placeholder="Describe the exam content and requirements..."
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
                    <option value="CERTIFICATION">Certification</option>
                    <option value="LANGUAGE">Language</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Mode *</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'PHYSICAL' | 'ONLINE' | 'HYBRID' })}
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
                  <label className="block text-sm font-medium text-gray-400 mb-2">Duration (minutes) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="1440"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Total Marks *</label>
                  <input
                    type="number"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({ ...formData, totalMarks: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="10000"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Passing Score (%) *</label>
                  <input
                    type="number"
                    value={formData.passingScore}
                    onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) || 0 })}
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Exam Fee ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.examFee}
                    onChange={(e) => setFormData({ ...formData, examFee: parseFloat(e.target.value) || 0 })}
                    min="0"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-teal-400 focus:ring-teal-400"
                />
                <label htmlFor="isActive" className="text-sm text-gray-400">
                  Active (visible to job seekers)
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingExam(null);
                }}
                className="px-6 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
              >
                {editingExam ? 'Update Exam' : 'Create Exam'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function ExamsManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <ExamsManagementContent />
    </ProtectedRoute>
  );
}

