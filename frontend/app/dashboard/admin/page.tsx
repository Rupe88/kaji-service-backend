'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { adminApi, trainingApi } from '@/lib/api-client';
import { useSocket } from '@/hooks/useSocket';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

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
      rejected?: number;
    };
    industrial: {
      total: number;
      pending: number;
      approved: number;
      rejected?: number;
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
  charts?: {
    timeSeries: Array<{
      date: string;
      users: number;
      jobs: number;
      applications: number;
    }>;
    usersByRole: Array<{
      role: string;
      count: number;
    }>;
    kycStatus: {
      individual: {
        approved: number;
        pending: number;
        rejected: number;
      };
      industrial: {
        approved: number;
        pending: number;
        rejected: number;
      };
    };
    applicationsByStatus: Array<{
      status: string;
      count: number;
    }>;
  };
}

interface CourseStats {
  total: number;
  active: number;
  enrollments: number;
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useSocket();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [courseStats, setCourseStats] = useState<CourseStats>({ total: 0, active: 0, enrollments: 0 });
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchStats = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const response = await adminApi.getDashboardStats();
      setStats(response.data);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      if (showLoading) {
        toast.error('Failed to load dashboard statistics');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  const fetchCourseStats = useCallback(async () => {
    try {
      const response = await trainingApi.getCourses({ limit: 1000 });
      const courses = response.data || [];
      const activeCourses = courses.filter((c: any) => c.isActive);
      
      // Get enrollments count
      const enrollmentsResponse = await trainingApi.getEnrollments({ limit: 1000 });
      const enrollments = enrollmentsResponse.data || [];
      
      setCourseStats({
        total: courses.length,
        active: activeCourses.length,
        enrollments: enrollments.length,
      });
    } catch (error: any) {
      console.error('Error fetching course stats:', error);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      fetchStats(true);
      fetchCourseStats();
      
      // Set up real-time polling every 30 seconds
      const interval = setInterval(() => {
        fetchStats(false); // Don't show loading spinner on auto-refresh
        fetchCourseStats();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.role, fetchStats, fetchCourseStats]);

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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-400">Manage platform users, KYCs, courses, and monitor system activity</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span>Live</span>
              <span className="text-gray-500">•</span>
              <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* KYC Requests */}
            <Link href="/dashboard/admin/kyc">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-400">KYC Requests</h3>
                  <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
            </Link>

            {/* Courses */}
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
                <h3 className="text-sm font-medium text-gray-400">Courses</h3>
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{courseStats.total}</div>
              <div className="text-sm text-gray-400">
                <span className="text-teal-400">{courseStats.active} active</span>
                {' • '}
                <span>{courseStats.enrollments} enrollments</span>
              </div>
            </motion.div>

            {/* Users */}
            <Link href="/dashboard/admin/users">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-400">Users</h3>
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
            </Link>

            {/* Notifications */}
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
                <h3 className="text-sm font-medium text-gray-400">Notifications</h3>
                <div className="relative">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-2">{notifications.length}</div>
              <div className="text-sm text-gray-400">
                <span className="text-red-400">{unreadCount} unread</span>
                {' • '}
                <span>{notifications.length - unreadCount} read</span>
              </div>
            </motion.div>
          </div>

          {/* Charts Section */}
          {stats.charts && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Time Series Chart - Users, Jobs, Applications */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Activity Over Last 30 Days</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={stats.charts.timeSeries}>
                    <defs>
                      <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.7 0.15 180)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="oklch(0.7 0.15 180)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.7 0.15 240)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="oklch(0.7 0.15 240)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="oklch(0.7 0.15 300)" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="oklch(0.7 0.15 300)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.3)" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: 'oklch(0.7 0 0)' }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis tick={{ fill: 'oklch(0.7 0 0)' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                        border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="users" 
                      stackId="1"
                      stroke="oklch(0.7 0.15 180)" 
                      fillOpacity={1}
                      fill="url(#colorUsers)"
                      name="Users"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="jobs" 
                      stackId="1"
                      stroke="oklch(0.7 0.15 240)" 
                      fillOpacity={1}
                      fill="url(#colorJobs)"
                      name="Jobs"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="applications" 
                      stackId="1"
                      stroke="oklch(0.7 0.15 300)" 
                      fillOpacity={1}
                      fill="url(#colorApplications)"
                      name="Applications"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Users by Role Pie Chart */}
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
                <h3 className="text-xl font-bold text-white mb-4">Users by Role</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={stats.charts.usersByRole}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ role, percent }) => `${role}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {stats.charts.usersByRole.map((entry, index) => {
                        const colors = ['oklch(0.7 0.15 180)', 'oklch(0.7 0.15 240)', 'oklch(0.7 0.15 300)'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                        border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>

              {/* KYC Status Chart */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">KYC Status Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      {
                        name: 'Individual',
                        Approved: stats.charts.kycStatus.individual.approved,
                        Pending: stats.charts.kycStatus.individual.pending,
                        Rejected: stats.charts.kycStatus.individual.rejected,
                      },
                      {
                        name: 'Industrial',
                        Approved: stats.charts.kycStatus.industrial.approved,
                        Pending: stats.charts.kycStatus.industrial.pending,
                        Rejected: stats.charts.kycStatus.industrial.rejected,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.3)" />
                    <XAxis dataKey="name" tick={{ fill: 'oklch(0.7 0 0)' }} />
                    <YAxis tick={{ fill: 'oklch(0.7 0 0)' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                        border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="Approved" stackId="a" fill="oklch(0.7 0.15 150)" />
                    <Bar dataKey="Pending" stackId="a" fill="oklch(0.7 0.15 60)" />
                    <Bar dataKey="Rejected" stackId="a" fill="oklch(0.65 0.2 330)" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Applications by Status */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Applications by Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.charts.applicationsByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.3)" />
                    <XAxis 
                      dataKey="status" 
                      tick={{ fill: 'oklch(0.7 0 0)' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis tick={{ fill: 'oklch(0.7 0 0)' }} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'oklch(0.15 0 0 / 0.95)',
                        border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                    />
                    <Bar dataKey="count" fill="oklch(0.7 0.15 240)" />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* KYC Requests Card */}
            <Link href="/dashboard/admin/kyc">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.2)' }}
                  >
                    <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">KYC Requests</h3>
                    <p className="text-sm text-gray-400">Review and approve</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">
                  {stats.kyc.individual.pending + stats.kyc.industrial.pending} pending
                </div>
              </motion.div>
            </Link>

            {/* Users Management Card */}
            <Link href="/dashboard/admin/users">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl cursor-pointer hover:scale-105 transition-transform"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'oklch(0.7 0.15 240 / 0.2)' }}
                  >
                    <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Users</h3>
                    <p className="text-sm text-gray-400">Manage all users</p>
                  </div>
                </div>
                <div className="text-2xl font-bold text-white">{stats.users.total} total</div>
              </motion.div>
            </Link>

            {/* API Integrations Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: 'oklch(0.7 0.15 300 / 0.2)' }}
                >
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">API Status</h3>
                  <p className="text-sm text-gray-400">System integrations</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Database</span>
                  <span className="text-green-400 font-semibold">✓ Connected</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Socket.io</span>
                  <span className="text-green-400 font-semibold">✓ Active</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Cloudinary</span>
                  <span className="text-green-400 font-semibold">✓ Connected</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Recent Notifications */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mb-8 p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Notifications</h2>
              {unreadCount > 0 && (
                <span className="px-3 py-1 rounded-lg text-sm font-semibold bg-red-500/20 text-red-400">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification, index) => {
                const isUnread = index < unreadCount;
                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-4 rounded-lg ${
                      isUnread ? 'border-l-4' : ''
                    }`}
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.4)',
                      borderLeftColor: isUnread ? 'oklch(0.7 0.15 180)' : 'transparent',
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                      style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.2)' }}
                    >
                      {notification.type === 'KYC_SUBMITTED' ? '📄' :
                       notification.type === 'KYC_STATUS' ? '✅' :
                       notification.type === 'JOB_APPLICATION' ? '📝' :
                       notification.type === 'APPLICATION_STATUS' ? '📋' : '🔔'}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium">{notification.title}</div>
                      <div className="text-sm text-gray-400 mt-1">{notification.message}</div>
                      <div className="text-xs text-gray-500 mt-2">
                        {notification.timestamp ? new Date(notification.timestamp).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                );
              })}
              {notifications.length === 0 && (
                <div className="text-center py-8 text-gray-400">No notifications yet</div>
              )}
            </div>
          </motion.div>

          {/* Recent Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Recent Users</h2>
              <Link href="/dashboard/admin/users">
                <span className="text-sm text-teal-400 hover:text-teal-300 cursor-pointer">View All →</span>
              </Link>
            </div>
            <div className="space-y-3">
              {stats.recentUsers.slice(0, 5).map((user) => (
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

