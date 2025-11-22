'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { adminApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { DocumentViewer } from '@/components/kyc/DocumentViewer';

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
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [kycDetails, setKycDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedKYCForDetails, setSelectedKYCForDetails] = useState<PendingKYC | null>(null);
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

  const handleViewDetails = async (kyc: PendingKYC) => {
    try {
      setLoadingDetails(true);
      setSelectedKYCForDetails(kyc);
      setShowDetailsModal(true);
      setKycDetails(null); // Clear previous data
      
      const response = await adminApi.getKYCDetails(kyc.kycType, kyc.userId);
      console.log('KYC details response:', response);
      
      // apiClient.get already extracts data from response.data.data
      // So response is already the data object
      if (response && typeof response === 'object') {
        setKycDetails(response);
      } else {
        console.error('Unexpected KYC response structure:', response);
        toast.error('Invalid response structure');
        setShowDetailsModal(false);
        setSelectedKYCForDetails(null);
      }
    } catch (error: any) {
      console.error('Error fetching KYC details:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(error.response?.data?.message || 'Failed to load KYC details');
      setShowDetailsModal(false);
      setKycDetails(null);
      setSelectedKYCForDetails(null);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedKYC) return;

    try {
      setUpdating(true);
      const updateData: {
        status: 'APPROVED' | 'REJECTED';
        rejectionReason?: string;
        adminNotes?: string;
      } = {
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
                          onClick={() => handleViewDetails(kyc)}
                          className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                          style={{
                            backgroundColor: 'oklch(0.7 0.15 240 / 0.3)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 240 / 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'oklch(0.7 0.15 240 / 0.3)';
                          }}
                        >
                          View Details
                        </button>
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

      {/* KYC Details Modal */}
      <AnimatePresence>
        {showDetailsModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowDetailsModal(false);
                setKycDetails(null);
              }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 md:inset-8 lg:inset-16 z-50 flex flex-col rounded-2xl border-2 overflow-hidden max-w-6xl mx-auto"
              style={{
                backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="p-6 border-b-2 flex items-center justify-between" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                <div>
                  <h2 className="text-2xl font-bold text-white">KYC Details</h2>
                  <p className="text-gray-400 mt-1">
                    {kycDetails?.fullName || kycDetails?.companyName || kycDetails?.user?.email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setKycDetails(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400"></div>
                  </div>
                ) : kycDetails ? (
                  <div className="space-y-6">
                    {/* Debug info - remove in production */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="p-2 bg-gray-800 rounded text-xs text-gray-400 mb-4">
                        Debug: KYC Details loaded - Type: {selectedKYCForDetails?.kycType}, UserId: {selectedKYCForDetails?.userId}
                        <br />
                        Data keys: {kycDetails ? Object.keys(kycDetails).join(', ') : 'No data'}
                      </div>
                    )}
                    
                    {/* Profile Photo */}
                    {(kycDetails.profilePhotoUrl || kycDetails.user?.profileImage) && (
                      <div className="flex justify-center">
                        <img
                          src={kycDetails.profilePhotoUrl || kycDetails.user?.profileImage}
                          alt="Profile"
                          className="w-32 h-32 rounded-full object-cover border-4"
                          style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* User Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">User Information</h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Name:</span>
                            <span className="text-white ml-2">{kycDetails.user?.firstName} {kycDetails.user?.lastName}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Email:</span>
                            <span className="text-white ml-2">{kycDetails.user?.email}</span>
                          </div>
                          <div>
                            <span className="text-gray-400">Phone:</span>
                            <span className="text-white ml-2">{kycDetails.user?.phone || kycDetails.phone || 'N/A'}</span>
                          </div>
                          {kycDetails.fullName && (
                            <div>
                              <span className="text-gray-400">Full Name:</span>
                              <span className="text-white ml-2">{kycDetails.fullName}</span>
                            </div>
                          )}
                          {kycDetails.companyName && (
                            <div>
                              <span className="text-gray-400">Company Name:</span>
                              <span className="text-white ml-2">{kycDetails.companyName}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status Information */}
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Status Information</h3>
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-400">Status:</span>
                            <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                              kycDetails.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                              kycDetails.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {kycDetails.status}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-400">Submitted:</span>
                            <span className="text-white ml-2">{new Date(kycDetails.createdAt).toLocaleDateString()}</span>
                          </div>
                          {kycDetails.verifiedAt && (
                            <div>
                              <span className="text-gray-400">Verified At:</span>
                              <span className="text-white ml-2">{new Date(kycDetails.verifiedAt).toLocaleDateString()}</span>
                            </div>
                          )}
                          {kycDetails.rejectionReason && (
                            <div>
                              <span className="text-gray-400">Rejection Reason:</span>
                              <span className="text-white ml-2">{kycDetails.rejectionReason}</span>
                            </div>
                          )}
                          {kycDetails.adminNotes && (
                            <div>
                              <span className="text-gray-400">Admin Notes:</span>
                              <span className="text-white ml-2">{kycDetails.adminNotes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Individual KYC Specific Fields */}
                    {kycDetails.gender && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Personal Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Gender:</span>
                            <span className="text-white ml-2">{kycDetails.gender}</span>
                          </div>
                          {kycDetails.pronouns && (
                            <div>
                              <span className="text-gray-400">Pronouns:</span>
                              <span className="text-white ml-2">{kycDetails.pronouns}</span>
                            </div>
                          )}
                          {kycDetails.dateOfBirth && (
                            <div>
                              <span className="text-gray-400">Date of Birth:</span>
                              <span className="text-white ml-2">{new Date(kycDetails.dateOfBirth).toLocaleDateString()}</span>
                            </div>
                          )}
                          {kycDetails.nationalId && (
                            <div>
                              <span className="text-gray-400">National ID:</span>
                              <span className="text-white ml-2">{kycDetails.nationalId}</span>
                            </div>
                          )}
                          {kycDetails.passportNumber && (
                            <div>
                              <span className="text-gray-400">Passport Number:</span>
                              <span className="text-white ml-2">{kycDetails.passportNumber}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Address Information */}
                    {(kycDetails.province || kycDetails.district) && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Address Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {kycDetails.country && (
                            <div>
                              <span className="text-gray-400">Country:</span>
                              <span className="text-white ml-2">{kycDetails.country}</span>
                            </div>
                          )}
                          {kycDetails.province && (
                            <div>
                              <span className="text-gray-400">Province:</span>
                              <span className="text-white ml-2">{kycDetails.province}</span>
                            </div>
                          )}
                          {kycDetails.district && (
                            <div>
                              <span className="text-gray-400">District:</span>
                              <span className="text-white ml-2">{kycDetails.district}</span>
                            </div>
                          )}
                          {kycDetails.municipality && (
                            <div>
                              <span className="text-gray-400">Municipality:</span>
                              <span className="text-white ml-2">{kycDetails.municipality}</span>
                            </div>
                          )}
                          {kycDetails.ward && (
                            <div>
                              <span className="text-gray-400">Ward:</span>
                              <span className="text-white ml-2">{kycDetails.ward}</span>
                            </div>
                          )}
                          {kycDetails.street && (
                            <div>
                              <span className="text-gray-400">Street:</span>
                              <span className="text-white ml-2">{kycDetails.street}</span>
                            </div>
                          )}
                          {kycDetails.city && (
                            <div>
                              <span className="text-gray-400">City:</span>
                              <span className="text-white ml-2">{kycDetails.city}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Education/Company Information */}
                    {kycDetails.highestQualification && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Education</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Highest Qualification:</span>
                            <span className="text-white ml-2">{kycDetails.highestQualification}</span>
                          </div>
                          {kycDetails.fieldOfStudy && (
                            <div>
                              <span className="text-gray-400">Field of Study:</span>
                              <span className="text-white ml-2">{kycDetails.fieldOfStudy}</span>
                            </div>
                          )}
                          {kycDetails.schoolUniversity && (
                            <div>
                              <span className="text-gray-400">School/University:</span>
                              <span className="text-white ml-2">{kycDetails.schoolUniversity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Industrial KYC Specific Fields */}
                    {kycDetails.companyEmail && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Company Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          {kycDetails.companyEmail && (
                            <div>
                              <span className="text-gray-400">Company Email:</span>
                              <span className="text-white ml-2">{kycDetails.companyEmail}</span>
                            </div>
                          )}
                          {kycDetails.companyPhone && (
                            <div>
                              <span className="text-gray-400">Company Phone:</span>
                              <span className="text-white ml-2">{kycDetails.companyPhone}</span>
                            </div>
                          )}
                          {kycDetails.registrationNumber && (
                            <div>
                              <span className="text-gray-400">Registration Number:</span>
                              <span className="text-white ml-2">{kycDetails.registrationNumber}</span>
                            </div>
                          )}
                          {kycDetails.yearsInBusiness && (
                            <div>
                              <span className="text-gray-400">Years in Business:</span>
                              <span className="text-white ml-2">{kycDetails.yearsInBusiness}</span>
                            </div>
                          )}
                          {kycDetails.companySize && (
                            <div>
                              <span className="text-gray-400">Company Size:</span>
                              <span className="text-white ml-2">{kycDetails.companySize}</span>
                            </div>
                          )}
                          {kycDetails.industrySector && (
                            <div>
                              <span className="text-gray-400">Industry Sector:</span>
                              <span className="text-white ml-2">{kycDetails.industrySector}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Skills */}
                    {(kycDetails.technicalSkills || kycDetails.softSkills) && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Skills</h3>
                        <div className="space-y-4">
                          {kycDetails.technicalSkills && (
                            <div>
                              <span className="text-gray-400 text-sm">Technical Skills:</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {Array.isArray(kycDetails.technicalSkills) ? (
                                  kycDetails.technicalSkills.map((skill: string, idx: number) => (
                                    <span key={idx} className="px-3 py-1 rounded-lg text-xs bg-teal-500/20 text-teal-400">
                                      {skill}
                                    </span>
                                  ))
                                ) : typeof kycDetails.technicalSkills === 'object' ? (
                                  Object.entries(kycDetails.technicalSkills).map(([key, value]: [string, any]) => (
                                    <span key={key} className="px-3 py-1 rounded-lg text-xs bg-teal-500/20 text-teal-400">
                                      {key}: {String(value)}
                                    </span>
                                  ))
                                ) : null}
                              </div>
                            </div>
                          )}
                          {kycDetails.softSkills && (
                            <div>
                              <span className="text-gray-400 text-sm">Soft Skills:</span>
                              <div className="flex flex-wrap gap-2 mt-2">
                                {Array.isArray(kycDetails.softSkills) ? (
                                  kycDetails.softSkills.map((skill: string, idx: number) => (
                                    <span key={idx} className="px-3 py-1 rounded-lg text-xs bg-purple-500/20 text-purple-400">
                                      {skill}
                                    </span>
                                  ))
                                ) : typeof kycDetails.softSkills === 'object' ? (
                                  Object.entries(kycDetails.softSkills).map(([key, value]: [string, any]) => (
                                    <span key={key} className="px-3 py-1 rounded-lg text-xs bg-purple-500/20 text-purple-400">
                                      {key}: {String(value)}
                                    </span>
                                  ))
                                ) : null}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Certifications (Platform Certifications) */}
                    {kycDetails.certifications && Array.isArray(kycDetails.certifications) && kycDetails.certifications.length > 0 && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Platform Certifications</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {kycDetails.certifications.map((cert: any) => (
                            <div key={cert.id} className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <span className="text-white font-semibold block">{cert.title}</span>
                                  <span className="text-gray-400 text-xs">{cert.category}</span>
                                </div>
                                {cert.isVerified && (
                                  <span className="px-2 py-1 rounded text-xs bg-green-500/20 text-green-400">Verified</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400 mb-2">
                                <div>Issued: {new Date(cert.issuedDate).toLocaleDateString()}</div>
                                {cert.expiryDate && <div>Expires: {new Date(cert.expiryDate).toLocaleDateString()}</div>}
                                <div>Cert #: {cert.certificateNumber}</div>
                              </div>
                              {cert.certificateUrl && (
                                <div className="mt-2">
                                  <DocumentViewer
                                    documentUrl={cert.certificateUrl}
                                    documentName={cert.title}
                                    documentType="pdf"
                                  />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* External Certifications */}
                    {kycDetails.externalCertifications && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">External Certifications</h3>
                        <div className="space-y-3">
                          {Array.isArray(kycDetails.externalCertifications) ? (
                            kycDetails.externalCertifications.map((cert: any, idx: number) => (
                              <div key={idx} className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                                <div className="text-white font-semibold">{cert.name || cert.title || `Certification ${idx + 1}`}</div>
                                {cert.issuer && <div className="text-gray-400 text-sm">Issuer: {cert.issuer}</div>}
                                {cert.issueDate && <div className="text-gray-400 text-sm">Date: {new Date(cert.issueDate).toLocaleDateString()}</div>}
                                {cert.url && (
                                  <div className="mt-2">
                                    <DocumentViewer
                                      documentUrl={cert.url}
                                      documentName={cert.name || cert.title || 'Certificate'}
                                      documentType="pdf"
                                    />
                                  </div>
                                )}
                              </div>
                            ))
                          ) : typeof kycDetails.externalCertifications === 'object' && kycDetails.externalCertifications !== null ? (
                            Object.entries(kycDetails.externalCertifications).map(([key, value]: [string, any]) => (
                              <div key={key} className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                                <div className="text-white font-semibold">{key}</div>
                                {typeof value === 'string' && value.startsWith('http') && (
                                  <div className="mt-2">
                                    <DocumentViewer
                                      documentUrl={value}
                                      documentName={key}
                                      documentType="pdf"
                                    />
                                  </div>
                                )}
                                {typeof value === 'object' && value.url && (
                                  <div className="mt-2">
                                    <DocumentViewer
                                      documentUrl={value.url}
                                      documentName={value.name || key}
                                      documentType="pdf"
                                    />
                                  </div>
                                )}
                              </div>
                            ))
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Resumes Section - All Resumes from Job Applications */}
                    {kycDetails.jobApplications && kycDetails.jobApplications.length > 0 && kycDetails.jobApplications.some((app: any) => app.resumeUrl && !app.resumeUrl.includes('example.com')) && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Resumes & Applications
                        </h3>
                        <div className="space-y-3">
                          {kycDetails.jobApplications
                            .filter((app: any) => app.resumeUrl && !app.resumeUrl.includes('example.com'))
                            .map((app: any) => (
                              <div key={app.id} className="p-4 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="text-white font-semibold text-base mb-1">
                                      {app.job?.title || 'Resume'}
                                    </div>
                                    {app.job?.employer?.companyName && (
                                      <div className="text-gray-400 text-sm mb-2">
                                        Company: {app.job.employer.companyName}
                                      </div>
                                    )}
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                      <span>Applied: {new Date(app.appliedAt).toLocaleDateString()}</span>
                                      {app.status && (
                                        <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">
                                          {app.status}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {app.resumeUrl && (
                                      <DocumentViewer
                                        documentUrl={app.resumeUrl}
                                        documentName={`Resume - ${app.job?.title || 'Application'}`}
                                        documentType="pdf"
                                      />
                                    )}
                                    {app.portfolioUrl && (
                                      <a
                                        href={app.portfolioUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-3 py-2 rounded-lg text-sm text-teal-400 hover:text-teal-300 border flex items-center gap-1"
                                        style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Portfolio
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Portfolio Links Section */}
                    {kycDetails.portfolioUrls && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                          Portfolio Links
                        </h3>
                        <div className="flex flex-wrap gap-3">
                          {Array.isArray(kycDetails.portfolioUrls) ? (
                            kycDetails.portfolioUrls.map((url: string, idx: number) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-lg text-sm text-teal-400 hover:text-teal-300 border flex items-center gap-2"
                                style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Portfolio {idx + 1}
                              </a>
                            ))
                          ) : typeof kycDetails.portfolioUrls === 'object' && kycDetails.portfolioUrls !== null ? (
                            Object.entries(kycDetails.portfolioUrls).map(([key, url]: [string, any]) => (
                              <a
                                key={key}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-lg text-sm text-teal-400 hover:text-teal-300 border flex items-center gap-2 capitalize"
                                style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {key}
                              </a>
                            ))
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Video Intro */}
                    {kycDetails.videoIntroUrl && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Video Introduction</h3>
                        <div className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                          <DocumentViewer
                            documentUrl={kycDetails.videoIntroUrl}
                            documentName="Video Introduction"
                            documentType="video"
                          />
                        </div>
                      </div>
                    )}

                    {/* Social Media Links */}
                    {kycDetails.socialMediaUrls && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4">Social Media & Links</h3>
                        <div className="flex flex-wrap gap-2">
                          {typeof kycDetails.socialMediaUrls === 'object' && kycDetails.socialMediaUrls !== null ? (
                            Object.entries(kycDetails.socialMediaUrls).map(([platform, url]: [string, any]) => (
                              <a
                                key={platform}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1 rounded-lg text-sm text-teal-400 hover:text-teal-300 border capitalize"
                                style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}
                              >
                                {platform}
                              </a>
                            ))
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* All Uploaded Assets & KYC Documents */}
                    {(kycDetails.registrationCertificate || 
                      kycDetails.taxClearanceCertificate || 
                      kycDetails.panCertificate || 
                      kycDetails.vatCertificate ||
                      kycDetails.videoKYCUrl ||
                      kycDetails.profilePhotoUrl) && (
                      <div className="p-4 rounded-lg border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.5)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          KYC Documents & Uploaded Assets
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Profile Photo */}
                          {kycDetails.profilePhotoUrl && (
                            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                              <span className="text-gray-400 text-sm block mb-2">Profile Photo:</span>
                              <div className="flex gap-2">
                                <img
                                  src={kycDetails.profilePhotoUrl}
                                  alt="Profile"
                                  className="w-20 h-20 rounded-lg object-cover border"
                                  style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <a
                                  href={kycDetails.profilePhotoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-teal-400 hover:text-teal-300 underline text-sm self-center"
                                >
                                  View Full Size
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Video KYC */}
                          {kycDetails.videoKYCUrl && (
                            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                              <span className="text-gray-400 text-sm block mb-2">Video KYC:</span>
                              <div className="mt-2">
                                <DocumentViewer
                                  documentUrl={kycDetails.videoKYCUrl}
                                  documentName="Video KYC"
                                  documentType="video"
                                />
                              </div>
                            </div>
                          )}

                          {/* Registration Certificate */}
                          {kycDetails.registrationCertificate && (
                            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                              <span className="text-gray-400 text-sm block mb-2">Registration Certificate:</span>
                              <div className="mt-2">
                                <DocumentViewer
                                  documentUrl={kycDetails.registrationCertificate}
                                  documentName="Registration Certificate"
                                  documentType="pdf"
                                />
                              </div>
                            </div>
                          )}

                          {/* Tax Clearance Certificate */}
                          {kycDetails.taxClearanceCertificate && (
                            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                              <span className="text-gray-400 text-sm block mb-2">Tax Clearance Certificate:</span>
                              <div className="mt-2">
                                <DocumentViewer
                                  documentUrl={kycDetails.taxClearanceCertificate}
                                  documentName="Tax Clearance Certificate"
                                  documentType="pdf"
                                />
                              </div>
                            </div>
                          )}

                          {/* PAN Certificate */}
                          {kycDetails.panCertificate && (
                            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                              <span className="text-gray-400 text-sm block mb-2">PAN Certificate:</span>
                              <div className="mt-2">
                                <DocumentViewer
                                  documentUrl={kycDetails.panCertificate}
                                  documentName="PAN Certificate"
                                  documentType="pdf"
                                />
                              </div>
                            </div>
                          )}

                          {/* VAT Certificate */}
                          {kycDetails.vatCertificate && (
                            <div className="p-3 rounded-lg border" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)', borderColor: 'oklch(0.7 0.15 180 / 0.2)' }}>
                              <span className="text-gray-400 text-sm block mb-2">VAT Certificate:</span>
                              <div className="mt-2">
                                <DocumentViewer
                                  documentUrl={kycDetails.vatCertificate}
                                  documentName="VAT Certificate"
                                  documentType="pdf"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <p className="text-gray-400">No details available</p>
                  </div>
                )}
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

