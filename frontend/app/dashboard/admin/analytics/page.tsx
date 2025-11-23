'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { analyticsApi, exportApi } from '@/lib/api-client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
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

interface PlatformStats {
  users?: {
    total: number;
    active: number;
  };
  kyc?: {
    individual: {
      total: number;
      approved: number;
      approvalRate: number;
    };
    industrial: {
      total: number;
      approved: number;
      approvalRate: number;
    };
  };
  jobs?: {
    total: number;
    active: number;
    totalApplications: number;
  };
  trainings?: {
    total: number;
  };
  exams?: {
    total: number;
  };
  events?: {
    total: number;
  };
  // Also support the old format
  totalUsers?: number;
  totalJobs?: number;
  activeJobs?: number;
  totalApplications?: number;
  pendingApplications?: number;
  approvedKYCs?: number;
  pendingKYCs?: number;
}

interface JobStats {
  totalJobs: number;
  activeJobs: number;
  totalApplications: number;
  jobsByType: Array<{ type: string; count: number }>;
  jobsByLocation: Array<{ province: string; district: string; count: number }>;
  averageSalary: {
    min: number | null;
    max: number | null;
  };
  charts: {
    timeSeries: Array<{ date: string; jobs: number; applications: number }>;
    jobsByType: Array<{ type: string; count: number }>;
    applicationsByStatus: Array<{ status: string; count: number }>;
  };
}

const COLORS = ['#14b8a6', '#a855f7', '#ec4899', '#3b82f6', '#f59e0b', '#10b981'];

function AnalyticsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
  const [activeTab, setActiveTab] = useState<'overview' | 'jobs' | 'users'>('overview');

  const fetchPlatformStats = useCallback(async () => {
    try {
      const stats = await analyticsApi.getPlatformStats();
      // Transform the API response to match our interface
      const transformedStats: PlatformStats = stats as any;
      setPlatformStats(transformedStats);
    } catch (error: any) {
      console.error('Error fetching platform stats:', error);
      toast.error('Failed to load platform statistics');
    }
  }, []);

  const fetchJobStats = useCallback(async () => {
    try {
      const params: any = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      
      const stats = await analyticsApi.getJobStatistics(params);
      setJobStats(stats);
    } catch (error: any) {
      console.error('Error fetching job stats:', error);
      toast.error('Failed to load job statistics');
    }
  }, [dateRange]);

  useEffect(() => {
    fetchPlatformStats();
  }, [fetchPlatformStats]);

  useEffect(() => {
    fetchJobStats();
  }, [fetchJobStats]);

  useEffect(() => {
    setLoading(false);
  }, [platformStats, jobStats]);

  const handleExport = async (type: 'jobs' | 'applications' | 'kycs') => {
    try {
      let blob: Blob;
      switch (type) {
        case 'jobs':
          blob = await exportApi.exportJobs({ format: 'csv' });
          break;
        case 'applications':
          blob = await exportApi.exportApplications({ format: 'csv' });
          break;
        case 'kycs':
          blob = await exportApi.exportKYCs({ format: 'csv' });
          break;
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} exported successfully!`);
    } catch (error: any) {
      toast.error(`Failed to export ${type}`);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading analytics...</div>
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
              <h1 className="text-4xl font-bold text-white mb-2">Analytics Dashboard</h1>
              <p className="text-gray-400">Platform insights and performance metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('jobs')}
                className="px-4 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors text-sm"
              >
                Export Jobs
              </button>
              <button
                onClick={() => handleExport('applications')}
                className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors text-sm"
              >
                Export Applications
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-6 flex items-center gap-2 border-b border-gray-800">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'overview'
                  ? 'text-teal-400 border-b-2 border-teal-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'jobs'
                  ? 'text-teal-400 border-b-2 border-teal-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Jobs Analytics
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 font-semibold transition-colors ${
                activeTab === 'users'
                  ? 'text-teal-400 border-b-2 border-teal-400'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              User Analytics
            </button>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && platformStats && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Users</h3>
                  <p className="text-3xl font-bold text-white">{(platformStats.users?.total || platformStats.totalUsers || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {platformStats.users?.active || 0} active
                  </p>
                </motion.div>

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
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Jobs</h3>
                  <p className="text-3xl font-bold text-white">{(platformStats.jobs?.total || platformStats.totalJobs || 0).toLocaleString()}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    {platformStats.jobs?.active || platformStats.activeJobs || 0} active • {(platformStats.jobs?.totalApplications || platformStats.totalApplications || 0).toLocaleString()} applications
                  </p>
                </motion.div>

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
                  <h3 className="text-sm font-medium text-gray-400 mb-2">KYC Approval Rate</h3>
                  <p className="text-3xl font-bold text-white">
                    {platformStats.kyc?.individual?.approvalRate ? platformStats.kyc.individual.approvalRate.toFixed(1) : '0.0'}%
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    {platformStats.kyc?.individual?.approved || 0} / {platformStats.kyc?.individual?.total || 0} individual
                  </p>
                </motion.div>

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
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Platform Content</h3>
                  <p className="text-3xl font-bold text-white">
                    {(platformStats.trainings?.total || 0) + (platformStats.exams?.total || 0) + (platformStats.events?.total || 0)}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    {platformStats.trainings?.total || 0} courses • {platformStats.exams?.total || 0} exams • {platformStats.events?.total || 0} events
                  </p>
                </motion.div>
              </div>

              {/* KYC Status Chart */}
              {platformStats && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <h3 className="text-xl font-bold text-white mb-4">KYC Status Distribution</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Individual KYC</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Approved', value: platformStats.kyc?.individual?.approved || 0 },
                              { name: 'Pending', value: (platformStats.kyc?.individual?.total || 0) - (platformStats.kyc?.individual?.approved || 0) },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.name}: ${entry.value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[(platformStats.kyc?.individual?.approved || 0), (platformStats.kyc?.individual?.total || 0) - (platformStats.kyc?.individual?.approved || 0)].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-400 mb-2">Industrial KYC</h4>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Approved', value: platformStats.kyc?.industrial?.approved || 0 },
                              { name: 'Pending', value: (platformStats.kyc?.industrial?.total || 0) - (platformStats.kyc?.industrial?.approved || 0) },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => `${entry.name}: ${entry.value}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {[(platformStats.kyc?.industrial?.approved || 0), (platformStats.kyc?.industrial?.total || 0) - (platformStats.kyc?.industrial?.approved || 0)].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {/* Jobs Analytics Tab */}
          {activeTab === 'jobs' && jobStats && (
            <div className="space-y-6">
              {/* Date Range Filter */}
              <div className="flex items-center gap-4">
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                />
                <button
                  onClick={() => setDateRange({ startDate: '', endDate: '' })}
                  className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 text-sm"
                >
                  Clear
                </button>
              </div>

              {/* Job Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Jobs</h3>
                  <p className="text-3xl font-bold text-white">{jobStats.totalJobs.toLocaleString()}</p>
                  <p className="text-sm text-gray-400 mt-2">{jobStats.activeJobs} active</p>
                </motion.div>

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
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Total Applications</h3>
                  <p className="text-3xl font-bold text-white">{jobStats.totalApplications.toLocaleString()}</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Avg: {jobStats.totalJobs > 0 ? (jobStats.totalApplications / jobStats.totalJobs).toFixed(1) : 0} per job
                  </p>
                </motion.div>

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
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Average Salary</h3>
                  <p className="text-3xl font-bold text-white">
                    {jobStats.averageSalary.min && jobStats.averageSalary.max
                      ? `Rs. ${((jobStats.averageSalary.min + jobStats.averageSalary.max) / 2).toLocaleString()}`
                      : 'N/A'}
                  </p>
                </motion.div>
              </div>

              {/* Time Series Chart */}
              {jobStats.charts.timeSeries && jobStats.charts.timeSeries.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <h3 className="text-xl font-bold text-white mb-4">Jobs & Applications Over Time (Last 30 Days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={jobStats.charts.timeSeries}>
                      <defs>
                        <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="date" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="jobs" stroke="#14b8a6" fillOpacity={1} fill="url(#colorJobs)" />
                      <Area type="monotone" dataKey="applications" stroke="#a855f7" fillOpacity={1} fill="url(#colorApplications)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Jobs by Type */}
              {jobStats.charts.jobsByType && jobStats.charts.jobsByType.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <h3 className="text-xl font-bold text-white mb-4">Jobs by Type</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={jobStats.charts.jobsByType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="type" stroke="#9ca3af" />
                      <YAxis stroke="#9ca3af" />
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                      <Bar dataKey="count" fill="#14b8a6" />
                    </BarChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Applications by Status */}
              {jobStats.charts.applicationsByStatus && jobStats.charts.applicationsByStatus.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}
                >
                  <h3 className="text-xl font-bold text-white mb-4">Applications by Status</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={jobStats.charts.applicationsByStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => `${entry.status}: ${entry.count}`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {jobStats.charts.applicationsByStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
          )}

          {/* User Analytics Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border-2 backdrop-blur-xl text-center"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <p className="text-gray-400">User analytics coming soon...</p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AnalyticsContent />
    </ProtectedRoute>
  );
}

