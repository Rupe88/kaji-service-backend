'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { certificationsApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import type { Certification } from '@/types/api';

function CertificationsManagementContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationResult, setVerificationResult] = useState<Certification | null>(null);

  const fetchCertifications = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedCategory) {
        params.category = selectedCategory;
      }
      if (searchQuery) {
        params.userId = searchQuery; // You might want to add a search endpoint
      }

      const response = await certificationsApi.list(params);
      
      if (response.data) {
        setCertifications(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching certifications:', error);
      toast.error('Failed to load certifications');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchCertifications();
  }, [fetchCertifications]);

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast.error('Please enter a verification code');
      return;
    }

    try {
      const result = await certificationsApi.verify(verificationCode);
      if (result.data) {
        setVerificationResult(result.data);
        toast.success('Certification verified!');
      } else {
        toast.error(result.message || 'Certification not found');
        setVerificationResult(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to verify certification');
      setVerificationResult(null);
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

  if (loading && certifications.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading certifications...</div>
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
              <h1 className="text-4xl font-bold text-white mb-2">Certifications Management</h1>
              <p className="text-gray-400">View and verify all platform certifications</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Certification
            </button>
          </div>

          {/* Verification Code Search */}
          <div className="mb-6 p-4 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <h3 className="text-lg font-semibold text-white mb-3">Verify Certification</h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                placeholder="Enter verification code"
                className="flex-1 px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
              />
              <button
                onClick={handleVerifyCode}
                className="px-6 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
              >
                Verify
              </button>
            </div>
            {verificationResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 rounded-lg bg-green-500/20 border border-green-500/30"
              >
                <p className="text-green-400 font-semibold mb-2">✓ Verified</p>
                <p className="text-white text-sm">Certificate: {verificationResult.title}</p>
                <p className="text-gray-400 text-xs">Issued to: {verificationResult.individual?.fullName || 'N/A'}</p>
                <p className="text-gray-400 text-xs">Certificate Number: {verificationResult.certificateNumber}</p>
              </motion.div>
            )}
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              placeholder="Search by user ID..."
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
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
          </div>

          {/* Certifications List */}
          {certifications.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No certifications found</p>
              <p className="text-gray-500 text-sm">Certifications will appear here when created</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {certifications.map((cert, index) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-2xl border-2 backdrop-blur-xl cursor-pointer hover:scale-[1.02] transition-transform"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                    onClick={() => setSelectedCertification(cert)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">{cert.title}</h3>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                            {cert.category}
                          </span>
                          {cert.isVerified && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                              Verified
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                          <div>
                            <p className="text-gray-400 mb-1">Issued To</p>
                            <p className="text-white font-semibold">
                              {cert.individual?.fullName || 'Unknown User'}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Issued Date</p>
                            <p className="text-white font-semibold">{formatDate(cert.issuedDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Certificate Number</p>
                            <p className="text-white font-mono text-xs">{cert.certificateNumber}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Verification Code</p>
                            <p className="text-white font-mono text-xs">{cert.verificationCode}</p>
                          </div>
                        </div>
                        {cert.expiryDate && (
                          <p className="text-sm text-gray-400">
                            Expires: {formatDate(cert.expiryDate)}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        {cert.certificateUrl && (
                          <a
                            href={cert.certificateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold transition-colors text-sm"
                          >
                            View Certificate
                          </a>
                        )}
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

      {/* Certification Details Modal */}
      {selectedCertification && (
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
              <h2 className="text-2xl font-bold text-white">Certification Details</h2>
              <button
                onClick={() => setSelectedCertification(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title</label>
                <p className="text-white">{selectedCertification.title}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Category</label>
                <p className="text-white">{selectedCertification.category}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Issued To</label>
                <p className="text-white">{selectedCertification.individual?.fullName || 'N/A'}</p>
                <p className="text-gray-400 text-sm">{selectedCertification.individual?.email || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Certificate Number</label>
                <p className="text-white font-mono">{selectedCertification.certificateNumber}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Verification Code</label>
                <p className="text-white font-mono">{selectedCertification.verificationCode}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Issued Date</label>
                  <p className="text-white">{formatDate(selectedCertification.issuedDate)}</p>
                </div>
                {selectedCertification.expiryDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Expiry Date</label>
                    <p className="text-white">{formatDate(selectedCertification.expiryDate)}</p>
                  </div>
                )}
              </div>
              {selectedCertification.certificateUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Certificate</label>
                  <a
                    href={selectedCertification.certificateUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal-400 hover:text-teal-300 underline"
                  >
                    View Certificate
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function CertificationsManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <CertificationsManagementContent />
    </ProtectedRoute>
  );
}

