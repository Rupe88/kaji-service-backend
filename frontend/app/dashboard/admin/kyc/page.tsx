'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { adminApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface PendingKYC {
  userId: string;
  status: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    profileImage?: string;
    createdAt: string;
  };
  fullName?: string;
  companyName?: string;
  kycType: 'INDIVIDUAL' | 'INDUSTRIAL';
}

function KYCManagementContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [kycs, setKycs] = useState<{ individual: PendingKYC[]; industrial: PendingKYC[] }>({
    individual: [],
    industrial: [],
  });
  const [selectedType, setSelectedType] = useState<'ALL' | 'INDIVIDUAL' | 'INDUSTRIAL'>('ALL');
  const [selectedKYC, setSelectedKYC] = useState<PendingKYC | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchPendingKYCs();
    }
  }, [user?.role, selectedType, pagination.page]);

  const fetchPendingKYCs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedType !== 'ALL') {
        params.type = selectedType;
      }

      const response = await adminApi.getPendingKYCs(params);
      setKycs({
        individual: (response.data.individual || []).map((k: any) => ({ ...k, kycType: 'INDIVIDUAL' })),
        industrial: (response.data.industrial || []).map((k: any) => ({ ...k, kycType: 'INDUSTRIAL' })),
      });
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching pending KYCs:', error);
      toast.error('Failed to load pending KYCs');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedKYC) return;

    try {
      setUpdating(true);
      const updateData = {
        status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED',
        rejectionReason: status === 'REJECTED' ? rejectionReason : undefined,
        adminNotes: adminNotes || undefined,
      };

      if (selectedKYC.kycType === 'INDIVIDUAL') {
        await adminApi.updateIndividualKYCStatus(selectedKYC.userId, updateData);
      } else {
        await adminApi.updateIndustrialKYCStatus(selectedKYC.userId, updateData);
      }

      toast.success(`KYC ${status.toLowerCase()} successfully`);
      setShowModal(false);
      setSelectedKYC(null);
      setRejectionReason('');
      setAdminNotes('');
      fetchPendingKYCs();
    } catch (error: any) {
      console.error('Error updating KYC status:', error);
      toast.error(error.response?.data?.message || 'Failed to update KYC status');
    } finally {
      setUpdating(false);
    }
  };

  const allKYCs = [...kycs.individual, ...kycs.industrial].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (loading && allKYCs.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading pending KYCs...</div>
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
            <h1 className="text-4xl font-bold text-white mb-2">KYC Management</h1>
            <p className="text-gray-400">Review and approve/reject KYC applications</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as 'ALL' | 'INDIVIDUAL' | 'INDUSTRIAL');
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                borderColor: 'oklch(0.7 0.15 180 / 0.2)',
              }}
            >
              <option value="ALL">All Types</option>
              <option value="INDIVIDUAL">Individual KYC</option>
              <option value="INDUSTRIAL">Industrial KYC</option>
            </select>
            <div className="text-sm text-gray-400">
              {allKYCs.length} pending {allKYCs.length === 1 ? 'application' : 'applications'}
            </div>
          </div>

          {/* KYC List */}
          {allKYCs.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-2xl font-bold text-white mb-2">No Pending KYCs</h3>
              <p className="text-gray-400">All KYC applications have been reviewed</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {allKYCs.map((kyc) => (
                  <motion.div
                    key={`${kyc.kycType}-${kyc.userId}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {kyc.user.profileImage ? (
                          <img
                            src={kyc.user.profileImage}
                            alt={kyc.user.firstName}
                            className="w-16 h-16 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                            {kyc.user.firstName?.[0] || kyc.user.email[0]}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-white">
                              {kyc.fullName || kyc.companyName || `${kyc.user.firstName} ${kyc.user.lastName}`}
                            </h3>
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold"
                              style={{
                                backgroundColor: kyc.kycType === 'INDIVIDUAL' ? 'oklch(0.7 0.15 180 / 0.2)' : 'oklch(0.7 0.15 240 / 0.2)',
                                color: kyc.kycType === 'INDIVIDUAL' ? 'oklch(0.7 0.15 180)' : 'oklch(0.7 0.15 240)',
                              }}
                            >
                              {kyc.kycType}
                            </span>
                            <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                              {kyc.status}
                            </span>
                          </div>
                          <p className="text-gray-400 mb-1">{kyc.user.email}</p>
                          <p className="text-gray-400 text-sm">{kyc.user.phone}</p>
                          <p className="text-gray-500 text-xs mt-2">
                            Submitted: {new Date(kyc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            setSelectedKYC(kyc);
                            setStatus('APPROVED');
                            setShowModal(true);
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                          style={{
                            backgroundColor: 'oklch(0.7 0.15 150 / 0.3)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 150 / 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 150 / 0.3)';
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            setSelectedKYC(kyc);
                            setStatus('REJECTED');
                            setShowModal(true);
                          }}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                          style={{
                            backgroundColor: 'oklch(0.65 0.2 330 / 0.3)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'oklch(0.65 0.2 330 / 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'oklch(0.65 0.2 330 / 0.3)';
                          }}
                        >
                          Reject
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
        {showModal && selectedKYC && (
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
                <h2 className="text-2xl font-bold text-white">
                  {status === 'APPROVED' ? 'Approve' : 'Reject'} KYC
                </h2>
                <p className="text-gray-400 mt-1">
                  {selectedKYC.fullName || selectedKYC.companyName || selectedKYC.user.email}
                </p>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  {status === 'REJECTED' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Rejection Reason <span className="text-red-400">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please provide a reason for rejection..."
                        rows={4}
                        className="w-full px-4 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add any internal notes..."
                      rows={3}
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
                    setSelectedKYC(null);
                    setRejectionReason('');
                    setAdminNotes('');
                  }}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={updating || (status === 'REJECTED' && !rejectionReason.trim())}
                  className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: status === 'APPROVED' ? 'oklch(0.7 0.15 150 / 0.3)' : 'oklch(0.65 0.2 330 / 0.3)',
                  }}
                >
                  {updating ? 'Processing...' : status === 'APPROVED' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default function KYCManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <KYCManagementContent />
    </ProtectedRoute>
  );
}

