'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { KYCAlert } from '@/components/dashboard/KYCAlert';
import { motion } from 'framer-motion';
import { jobsApi, applicationsApi, trendingApi, analyticsApi, kycApi, skillMatchingApi } from '@/lib/api-client';
import type { JobPosting, JobApplicationWithJob, TrendingJob, UserStatistics, JobRecommendation, JobRecommendationsResponse } from '@/types/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      router.push('/dashboard/admin');
    }
  }, [user?.role, router]);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([]);
  const [recentApplications, setRecentApplications] = useState<JobApplicationWithJob[]>([]);
  const [trendingJobs, setTrendingJobs] = useState<TrendingJob[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobRecommendation[]>([]);
  const [kycStatus, setKycStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | null>(null);
  const [kycSubmittedAt, setKycSubmittedAt] = useState<string | undefined>(undefined);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    // Only fetch if user is loaded and we have user ID
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch KYC status
        if (user.id && user.role) {
          // Admins don't need KYC verification
          if (user.role === 'ADMIN') {
            setKycStatus('APPROVED');
            return;
          }
          
          try {
            // Only fetch for INDIVIDUAL or INDUSTRIAL
            if (user.role === 'INDIVIDUAL' || user.role === 'INDUSTRIAL') {
              const kycData = await kycApi.getKYC(user.id, user.role);
              if (kycData) {
                // Get status - should be PENDING, APPROVED, REJECTED, or RESUBMITTED
                // If status is missing, default to PENDING (shouldn't happen, but safety check)
                const status = (kycData.status || 'PENDING') as 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
                setKycStatus(status);
                
                // Get submission date - prefer submittedAt, fallback to createdAt
                const submittedDate = kycData.submittedAt || kycData.createdAt;
                setKycSubmittedAt(submittedDate);
                
                // Debug log (remove in production)
                console.log('KYC Status:', status, 'Submitted At:', submittedDate);
              } else {
                setKycStatus(null);
                setKycSubmittedAt(undefined);
              }
            }
          } catch (error) {
            // Only log unexpected errors (404 is handled in getKYC)
            console.error('Error fetching KYC:', error);
            setKycStatus(null);
            setKycSubmittedAt(undefined);
          }
        }

        const [statsData, jobsData, applicationsData, trendingData, recommendationsData] = await Promise.allSettled([
          analyticsApi.getUserStats(user.id).catch(() => null),
          jobsApi.list({ limit: 5 }).catch(() => ({ data: [] })),
          applicationsApi.getByUser(user.id).catch(() => []),
          trendingApi.getJobs().catch(() => []),
          user.role === 'INDIVIDUAL' ? skillMatchingApi.getRecommendations({ limit: 5, minScore: 50 }).catch(() => ({ data: [], count: 0 })) : Promise.resolve({ data: [], count: 0 }),
        ]);

        if (statsData.status === 'fulfilled' && statsData.value) {
          setUserStats(statsData.value);
          if (statsData.value.charts) {
            setChartData(statsData.value.charts);
          }
        }
        if (jobsData.status === 'fulfilled' && jobsData.value) {
          setRecentJobs(jobsData.value.data || []);
        }
        if (applicationsData.status === 'fulfilled' && applicationsData.value) {
          // Handle both array and paginated response
          let applications: JobApplicationWithJob[] = [];
          if (Array.isArray(applicationsData.value)) {
            applications = applicationsData.value;
          } else if (applicationsData.value && typeof applicationsData.value === 'object' && 'data' in applicationsData.value) {
            applications = (applicationsData.value as any).data || [];
          }
          // Sort by createdAt (most recent first) and take first 5
          const sorted = applications
            .sort((a, b) => new Date(b.createdAt || b.appliedAt || '').getTime() - new Date(a.createdAt || a.appliedAt || '').getTime())
            .slice(0, 5);
          setRecentApplications(sorted);
        }
        if (trendingData.status === 'fulfilled' && trendingData.value) {
          setTrendingJobs(Array.isArray(trendingData.value) ? trendingData.value.slice(0, 3) : []);
        }
        if (recommendationsData.status === 'fulfilled' && recommendationsData.value) {
          const recommendations = recommendationsData.value as { data?: JobRecommendation[]; count?: number };
          setRecommendedJobs(recommendations.data || []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    // Only depend on user.id and user.role, not the entire user object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  const formatLocation = (location: JobPosting['location'], job?: JobPosting) => {
    let locationStr = '';
    
    // Try location object first (from backend transformation)
    if (location) {
      const parts = [
        location.city || location.municipality,
        location.district,
        location.province
      ].filter(Boolean);
      if (parts.length > 0) {
        locationStr = parts.join(', ');
      }
    }
    
    // Fallback to direct properties if location object doesn't exist (for backward compatibility)
    if (!locationStr && job) {
      const parts = [
        (job as any).city,
        (job as any).district,
        (job as any).province
      ].filter(Boolean);
      if (parts.length > 0) {
        locationStr = parts.join(', ');
      }
    }
    
    if (!locationStr) return 'Location not specified';
    return locationStr;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading dashboard...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Employer Dashboard
  if (user?.role === 'INDUSTRIAL') {
    return (
      <DashboardLayout>
        <EmployerDashboardContent user={user} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* KYC Alert Banner */}
      <KYCAlert kycStatus={kycStatus} submittedAt={kycSubmittedAt} />
      
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Welcome back, {user?.firstName}! 👋
          </h1>
          <p className="text-gray-400">Here's what's happening with your job search today.</p>
        </div>

        {/* Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Applications"
              value={userStats.applications.total}
              icon={
                <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
            />
            <StatsCard
              title="Accepted"
              value={userStats.applications.byStatus.find(s => s.status === 'ACCEPTED')?.count || 0}
              icon={
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              gradient="bg-gradient-to-br from-green-500 to-emerald-500"
            />
            <StatsCard
              title="Trainings"
              value={userStats.trainings.total}
              icon={
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              }
              gradient="bg-gradient-to-br from-purple-500 to-pink-500"
            />
            <StatsCard
              title="Certifications"
              value={userStats.certifications.total}
              icon={
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              }
              gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
            />
          </div>
        )}

        {/* Charts Section */}
        {chartData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Applications Over Time */}
            {chartData.timeSeries && chartData.timeSeries.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 backdrop-blur-xl p-6"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Applications Over Time</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.timeSeries}>
                    <defs>
                      <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#9ca3af" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'oklch(0.15 0 0)', 
                        border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="applications" 
                      stroke="#14b8a6" 
                      fillOpacity={1}
                      fill="url(#colorApplications)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </motion.div>
            )}

            {/* Application Status Breakdown */}
            {chartData.applicationsByStatus && chartData.applicationsByStatus.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 backdrop-blur-xl p-6"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Application Status</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.applicationsByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, percent }) => `${status}: ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {chartData.applicationsByStatus.map((entry: any, index: number) => {
                        const colors = ['#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'oklch(0.15 0 0)', 
                        border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </motion.div>
            )}
          </div>
        )}

        {/* Jobs for You Section */}
        {recommendedJobs.length > 0 && (
          <div className="mb-8">
            <div className="rounded-2xl border-2 backdrop-blur-xl p-6" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 300 / 0.3)',
            }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">🎯 Jobs for You</h2>
                  <p className="text-gray-400 text-sm">Personalized job recommendations based on your skills</p>
                </div>
                <Link href="/dashboard/jobs" className="text-sm text-purple-400 hover:text-purple-300">
                  View all →
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recommendedJobs.slice(0, 6).map((match) => (
                  <motion.div
                    key={match.job.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl border border-gray-800/50 hover:border-purple-500/50 transition-all cursor-pointer"
                    style={{ backgroundColor: 'oklch(0.1 0 0 / 0.4)' }}
                    onClick={() => router.push(`/dashboard/jobs/${match.job.id}`)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-semibold text-sm flex-1 line-clamp-2">{match.job.title}</h3>
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                        {Math.round(match.matchScore)}%
                      </span>
                    </div>
                    {match.job.employer && (
                      <p className="text-gray-300 text-xs mb-2">{match.job.employer.companyName}</p>
                    )}
                    <p className="text-gray-400 text-xs mb-2">
                      {formatLocation(match.job.location, match.job as any)}
                      {match.distance !== undefined && match.distance !== null && ` • ${match.distance}km away`}
                    </p>
                    {match.job.salaryMin && match.job.salaryMax && (
                      <p className="text-teal-400 text-xs font-semibold mb-2">
                        Rs. {match.job.salaryMin.toLocaleString()} - {match.job.salaryMax.toLocaleString()}
                      </p>
                    )}
                    {match.details.matchedSkills && match.details.matchedSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {match.details.matchedSkills.slice(0, 3).map((skill: string) => (
                          <span key={skill} className="px-2 py-0.5 rounded text-xs bg-purple-500/20 text-purple-300">
                            {skill}
                          </span>
                        ))}
                        {match.details.matchedSkills.length > 3 && (
                          <span className="px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-400">
                            +{match.details.matchedSkills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Applications */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border-2 backdrop-blur-xl p-6" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.2)',
            }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Recent Applications</h2>
                <Link href="/dashboard/applications" className="text-sm text-teal-400 hover:text-teal-300">
                  View all →
                </Link>
              </div>
              {recentApplications.length > 0 ? (
                <div className="space-y-4">
                  {recentApplications.map((app) => (
                    <motion.div
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-xl border border-gray-800/50 hover:border-teal-500/30 transition-all cursor-pointer"
                      style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)' }}
                      onClick={() => app.job?.id && router.push(`/dashboard/jobs/${app.job.id}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1 hover:text-teal-400 transition-colors">
                            {app.job?.title || 'Job Application'}
                          </h3>
                          {(app.job as any)?.employer && (
                            <p className="text-gray-300 text-sm mb-1">{(app.job as any).employer.companyName}</p>
                          )}
                          {app.job && (
                            <p className="text-gray-400 text-sm mb-2">{formatLocation(app.job.location, app.job)}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs mt-2">
                            <span className={`px-2 py-1 rounded-full font-medium ${
                              app.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              app.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                              app.status === 'SHORTLISTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              app.status === 'INTERVIEW' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                            }`}>
                              {app.status}
                            </span>
                            <span className="text-gray-500">
                              {new Date(app.createdAt || app.appliedAt || '').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </div>
                        {app.job?.id && (
                          <svg className="w-5 h-5 text-gray-400 ml-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8">No applications yet</p>
              )}
            </div>
          </div>

          {/* Trending Jobs */}
          <div>
            <div className="rounded-2xl border-2 backdrop-blur-xl p-6" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.2)',
            }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Trending Jobs</h2>
                <Link href="/dashboard/jobs" className="text-sm text-teal-400 hover:text-teal-300">
                  View all →
                </Link>
              </div>
              {trendingJobs.length > 0 ? (
                <div className="space-y-4">
                  {trendingJobs.map((trending) => (
                    <motion.div
                      key={trending.jobId}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border border-gray-800/50 hover:border-teal-500/50 transition-all cursor-pointer group"
                      style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)' }}
                      onClick={() => router.push(`/dashboard/jobs/${trending.jobId}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-white font-semibold text-sm group-hover:text-teal-400 transition-colors flex-1">{trending.job.title}</h3>
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white animate-pulse">
                          🔥 Trending
                        </span>
                      </div>
                      <p className="text-gray-400 text-xs mb-2">{formatLocation(trending.job.location, trending.job as any)}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          {trending.applicationCount} applications
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {trending.viewCount} views
                        </span>
                        {trending.trendScore && (
                          <>
                            <span>•</span>
                            <span className="text-teal-400 font-semibold">Score: {Math.round(trending.trendScore)}</span>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-center py-8 text-sm">No trending jobs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Employer Dashboard Component
function EmployerDashboardContent({ user }: { user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      fetchEmployerStats();
    }
  }, [user?.id]);

  const fetchEmployerStats = async () => {
    try {
      setLoading(true);
      const stats = await analyticsApi.getJobStatistics({ employerId: user.id });
      setJobStats(stats);
      if (stats.charts) {
        setChartData(stats.charts);
      }
    } catch (error) {
      console.error('Error fetching employer stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
          <div className="text-white text-lg">Loading dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-400">Here's your employer dashboard overview.</p>
      </div>

      {/* Stats Cards */}
      {jobStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Jobs"
            value={jobStats.totalJobs || 0}
            icon={
              <svg className="w-6 h-6 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            }
            gradient="bg-gradient-to-br from-teal-500 to-cyan-500"
          />
          <StatsCard
            title="Active Jobs"
            value={jobStats.activeJobs || 0}
            icon={
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            gradient="bg-gradient-to-br from-green-500 to-emerald-500"
          />
          <StatsCard
            title="Total Applications"
            value={jobStats.totalApplications || 0}
            icon={
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            gradient="bg-gradient-to-br from-purple-500 to-pink-500"
          />
          <StatsCard
            title="Avg Salary"
            value={jobStats.averageSalary?.min && jobStats.averageSalary?.max 
              ? `Rs. ${Math.round((jobStats.averageSalary.min + jobStats.averageSalary.max) / 2).toLocaleString()}`
              : 'N/A'}
            icon={
              <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            gradient="bg-gradient-to-br from-yellow-500 to-orange-500"
          />
        </div>
      )}

      {/* Charts Section */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Applications Over Time */}
          {chartData.timeSeries && chartData.timeSeries.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 backdrop-blur-xl p-6"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Applications Over Time</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.timeSeries}>
                  <defs>
                    <linearGradient id="colorEmpApplications" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af"
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'oklch(0.15 0 0)', 
                      border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="applications" 
                    stroke="#8b5cf6" 
                    fillOpacity={1}
                    fill="url(#colorEmpApplications)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Application Status Breakdown */}
          {chartData.applicationsByStatus && chartData.applicationsByStatus.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 backdrop-blur-xl p-6"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Application Status</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={chartData.applicationsByStatus}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percent }) => `${status}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chartData.applicationsByStatus.map((entry: any, index: number) => {
                      const colors = ['#8b5cf6', '#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#3b82f6'];
                      return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                    })}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'oklch(0.15 0 0)', 
                      border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Jobs by Type */}
          {chartData.jobsByType && chartData.jobsByType.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border-2 backdrop-blur-xl p-6"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Jobs by Type</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.jobsByType}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0 0)" />
                  <XAxis 
                    dataKey="type" 
                    stroke="#9ca3af"
                    tickFormatter={(value) => value.replace(/_/g, ' ').substring(0, 10)}
                  />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'oklch(0.15 0 0)', 
                      border: '1px solid oklch(0.7 0.15 180 / 0.3)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count" fill="#14b8a6" />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href="/dashboard/employer/jobs">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border-2 backdrop-blur-xl p-6 cursor-pointer"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Manage Jobs</h3>
            <p className="text-gray-400">View and manage your job postings</p>
          </motion.div>
        </Link>
        <Link href="/dashboard/employer/post-job">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="rounded-2xl border-2 backdrop-blur-xl p-6 cursor-pointer"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <h3 className="text-xl font-bold text-white mb-2">Post New Job</h3>
            <p className="text-gray-400">Create a new job posting</p>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
