'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { adminApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'INDIVIDUAL' | 'INDUSTRIAL' | 'ADMIN';
  status: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
  isEmailVerified: boolean;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  individualKYC?: {
    status: string;
    fullName: string;
  };
  industrialKYC?: {
    status: string;
    companyName: string;
  };
}

function UserManagementContent() {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState({
    role: '',
    status: '',
    search: '',
  });
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DELETED'>('ACTIVE');
  const [statusReason, setStatusReason] = useState('');
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (currentUser?.role === 'ADMIN') {
      fetchUsers();
    }
  }, [currentUser?.role, filters, pagination.page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (filters.role) params.role = filters.role;
      if (filters.status) params.status = filters.status;
      if (filters.search) params.search = filters.search;

      const response = await adminApi.getUsers(params);
      setUsers(response.data || []);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedUser) return;

    try {
      setUpdating(true);
      await adminApi.updateUserStatus(selectedUser.id, {
        status: newStatus,
        reason: statusReason || undefined,
      });

      toast.success(`User status updated to ${newStatus}`);
      setShowStatusModal(false);
      setSelectedUser(null);
      setStatusReason('');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error(error.response?.data?.message || 'Failed to update user status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { bg: 'oklch(0.7 0.15 150 / 0.2)', text: 'oklch(0.7 0.15 150)' };
      case 'SUSPENDED':
        return { bg: 'oklch(0.65 0.2 330 / 0.2)', text: 'oklch(0.65 0.2 330)' };
      case 'PENDING_VERIFICATION':
        return { bg: 'oklch(0.7 0.15 60 / 0.2)', text: 'oklch(0.7 0.15 60)' };
      case 'DELETED':
        return { bg: 'oklch(0.5 0 0 / 0.2)', text: 'oklch(0.5 0 0)' };
      default:
        return { bg: 'oklch(0.5 0 0 / 0.2)', text: 'oklch(0.5 0 0)' };
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { bg: 'oklch(0.7 0.15 300 / 0.2)', text: 'oklch(0.7 0.15 300)' };
      case 'INDUSTRIAL':
        return { bg: 'oklch(0.7 0.15 240 / 0.2)', text: 'oklch(0.7 0.15 240)' };
      case 'INDIVIDUAL':
        return { bg: 'oklch(0.7 0.15 180 / 0.2)', text: 'oklch(0.7 0.15 180)' };
      default:
        return { bg: 'oklch(0.5 0 0 / 0.2)', text: 'oklch(0.5 0 0)' };
    }
  };

  if (loading && users.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading users...</div>
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
            <h1 className="text-4xl font-bold text-white mb-2">User Management</h1>
            <p className="text-gray-400">Manage all platform users and their accounts</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search by email, name..."
              value={filters.search}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, search: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2 flex-1 min-w-[200px]"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                borderColor: 'oklch(0.7 0.15 180 / 0.2)',
              }}
            />
            <select
              value={filters.role}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, role: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                borderColor: 'oklch(0.7 0.15 180 / 0.2)',
              }}
            >
              <option value="">All Roles</option>
              <option value="INDIVIDUAL">Individual</option>
              <option value="INDUSTRIAL">Industrial</option>
              <option value="ADMIN">Admin</option>
            </select>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters(prev => ({ ...prev, status: e.target.value }));
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                borderColor: 'oklch(0.7 0.15 180 / 0.2)',
              }}
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_VERIFICATION">Pending</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DELETED">Deleted</option>
            </select>
          </div>

          {/* Users List */}
          {users.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <h3 className="text-2xl font-bold text-white mb-2">No users found</h3>
              <p className="text-gray-400">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {users.map((user) => {
                  const statusColors = getStatusColor(user.status);
                  const roleColors = getRoleColor(user.role);
                  return (
                    <motion.div
                      key={user.id}
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
                          {user.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.firstName}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
                              {user.firstName?.[0] || user.email[0]}
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-white">
                                {user.firstName} {user.lastName}
                              </h3>
                              <span 
                                className="px-3 py-1 rounded-lg text-xs font-semibold border"
                                style={{
                                  backgroundColor: roleColors.bg,
                                  color: roleColors.text,
                                  borderColor: roleColors.text + '40',
                                }}
                              >
                                {user.role}
                              </span>
                              <span 
                                className="px-3 py-1 rounded-lg text-xs font-semibold border"
                                style={{
                                  backgroundColor: statusColors.bg,
                                  color: statusColors.text,
                                  borderColor: statusColors.text + '40',
                                }}
                              >
                                {user.status.replace('_', ' ')}
                              </span>
                              {user.isEmailVerified && (
                                <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-green-500/20 text-green-400">
                                  Verified
                                </span>
                              )}
                            </div>
                            <p className="text-gray-400 mb-1">{user.email}</p>
                            {user.phone && <p className="text-gray-400 text-sm mb-2">{user.phone}</p>}
                            <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                              <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
                              {user.lastLoginAt && (
                                <span>Last login: {new Date(user.lastLoginAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            {(user.individualKYC || user.industrialKYC) && (
                              <div className="mt-2 text-xs text-gray-400">
                                KYC: {user.individualKYC?.status || user.industrialKYC?.status || 'N/A'}
                              </div>
                            )}
                          </div>
                        </div>
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => {
                              setSelectedUser(user);
                              setNewStatus(user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE');
                              setShowStatusModal(true);
                            }}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all"
                            style={{
                              backgroundColor: user.status === 'ACTIVE' ? 'oklch(0.65 0.2 330 / 0.3)' : 'oklch(0.7 0.15 150 / 0.3)',
                            }}
                          >
                            {user.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                        )}
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
                Page {pagination.page} of {pagination.pages} ({pagination.total} total)
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
        {showStatusModal && selectedUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStatusModal(false)}
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
                <h2 className="text-2xl font-bold text-white">Update User Status</h2>
                <p className="text-gray-400 mt-1">{selectedUser.email}</p>
              </div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as 'ACTIVE' | 'SUSPENDED' | 'DELETED')}
                      className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                      <option value="DELETED">Deleted</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reason (Optional)
                    </label>
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Add a reason for this status change..."
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
                    setShowStatusModal(false);
                    setSelectedUser(null);
                    setStatusReason('');
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

export default function UserManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <UserManagementContent />
    </ProtectedRoute>
  );
}

