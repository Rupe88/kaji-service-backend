'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { adminApi } from '@/lib/api-client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

interface DashboardStats {
  users: {
    total: number;
    active: number;
    pending: number;
  };
  kyc: {
    individual: {
      total: number;
      pending: number;
      approved: number;
    };
    industrial: {
      total: number;
      pending: number;
      approved: number;
    };
  };
  jobs: {
    total: number;
    active: number;
  };
  applications: {
    total: number;
  };
  recentUsers: Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    status: string;
    createdAt: string;
  }>;
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchStats();
    }
  }, [user?.role]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getDashboardStats();
      setStats(response.data);
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading dashboard...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!stats) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-16">
            <p className="text-gray-400">Failed to load dashboard statistics</p>
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
            <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Manage platform users, KYCs, and monitor system activity</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Users */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Total Users</h3>
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stats.users.total}</div>
              <div className="text-sm text-gray-400">
                <span className="text-teal-400">{stats.users.active} active</span>
                {' • '}
                <span className="text-yellow-400">{stats.users.pending} pending</span>
              </div>
            </motion.div>

            {/* Pending KYCs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Pending KYCs</h3>
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {stats.kyc.individual.pending + stats.kyc.industrial.pending}
              </div>
              <div className="text-sm text-gray-400">
                <span>{stats.kyc.individual.pending} individual</span>
                {' • '}
                <span>{stats.kyc.industrial.pending} industrial</span>
              </div>
            </motion.div>

            {/* Active Jobs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Active Jobs</h3>
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stats.jobs.active}</div>
              <div className="text-sm text-gray-400">of {stats.jobs.total} total jobs</div>
            </motion.div>

            {/* Total Applications */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-400">Applications</h3>
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{stats.applications.total}</div>
              <div className="text-sm text-gray-400">Total applications</div>
            </motion.div>
          </div>

          {/* KYC Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8 p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">KYC Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Individual KYC */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Individual KYC</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white font-semibold">{stats.kyc.individual.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Approved</span>
                    <span className="text-green-400 font-semibold">{stats.kyc.individual.approved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Pending</span>
                    <span className="text-yellow-400 font-semibold">{stats.kyc.individual.pending}</span>
                  </div>
                </div>
              </div>

              {/* Industrial KYC */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Industrial KYC</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Total</span>
                    <span className="text-white font-semibold">{stats.kyc.industrial.total}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Approved</span>
                    <span className="text-green-400 font-semibold">{stats.kyc.industrial.approved}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Pending</span>
                    <span className="text-yellow-400 font-semibold">{stats.kyc.industrial.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Recent Users</h2>
            <div className="space-y-3">
              {stats.recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-lg"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.4)',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-bold">
                      {user.firstName?.[0] || user.email[0]}
                    </div>
                    <div>
                      <div className="text-white font-medium">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-400">{user.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: user.role === 'ADMIN' ? 'oklch(0.7 0.15 300 / 0.2)' : user.role === 'INDUSTRIAL' ? 'oklch(0.7 0.15 240 / 0.2)' : 'oklch(0.7 0.15 180 / 0.2)',
                        color: user.role === 'ADMIN' ? 'oklch(0.7 0.15 300)' : user.role === 'INDUSTRIAL' ? 'oklch(0.7 0.15 240)' : 'oklch(0.7 0.15 180)',
                      }}
                    >
                      {user.role}
                    </span>
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold"
                      style={{
                        backgroundColor: user.status === 'ACTIVE' ? 'oklch(0.7 0.15 150 / 0.2)' : 'oklch(0.7 0.15 60 / 0.2)',
                        color: user.status === 'ACTIVE' ? 'oklch(0.7 0.15 150)' : 'oklch(0.7 0.15 60)',
                      }}
                    >
                      {user.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

