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

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobPosting[]>([]);
  const [recentApplications, setRecentApplications] = useState<JobApplicationWithJob[]>([]);
  const [trendingJobs, setTrendingJobs] = useState<TrendingJob[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobRecommendation[]>([]);
  const [kycStatus, setKycStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | null>(null);
  const [kycSubmittedAt, setKycSubmittedAt] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Fetch KYC status
        if (user?.id && user?.role) {
          try {
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
          } catch (error) {
            // Only log unexpected errors (404 is handled in getKYC)
            console.error('Error fetching KYC:', error);
            setKycStatus(null);
            setKycSubmittedAt(undefined);
          }
        }

        const [statsData, jobsData, applicationsData, trendingData, recommendationsData] = await Promise.allSettled([
          user ? analyticsApi.getUserStats(user.id).catch(() => null) : Promise.resolve(null),
          jobsApi.list({ limit: 5 }).catch(() => ({ data: [] })),
          user ? applicationsApi.getByUser(user.id).catch(() => []) : Promise.resolve([]),
          trendingApi.getJobs().catch(() => []),
          user && user.role === 'INDIVIDUAL' ? skillMatchingApi.getRecommendations({ limit: 5, minScore: 50 }).catch(() => ({ data: [], count: 0 })) : Promise.resolve({ data: [], count: 0 }),
        ]);

        if (statsData.status === 'fulfilled' && statsData.value) {
          setUserStats(statsData.value);
        }
        if (jobsData.status === 'fulfilled' && jobsData.value) {
          setRecentJobs(jobsData.value.data || []);
        }
        if (applicationsData.status === 'fulfilled' && applicationsData.value) {
          setRecentApplications(Array.isArray(applicationsData.value) ? applicationsData.value.slice(0, 5) : []);
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
  }, [user]);

  const formatLocation = (location: JobPosting['location']) => {
    if (!location) return 'Location not specified';
    const parts = [
      location.city || location.municipality,
      location.district,
      location.province
    ].filter(Boolean);
    if (parts.length === 0) return 'Location not specified';
    return parts.join(', ');
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
                      {formatLocation(match.job.location)}
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
                      className="p-4 rounded-xl border border-gray-800/50 hover:border-teal-500/30 transition-all"
                      style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)' }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-semibold mb-1">{app.job?.title || 'Job Application'}</h3>
                          {app.job && (
                            <p className="text-gray-400 text-sm mb-2">{formatLocation(app.job.location)}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs">
                            <span className={`px-2 py-1 rounded-full ${
                              app.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' :
                              app.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                              app.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {app.status}
                            </span>
                            <span className="text-gray-500">{new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
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
                      className="p-4 rounded-xl border border-gray-800/50 hover:border-purple-500/30 transition-all cursor-pointer"
                      style={{ backgroundColor: 'oklch(0.1 0 0 / 0.3)' }}
                    >
                      <h3 className="text-white font-semibold mb-1 text-sm">{trending.job.title}</h3>
                      <p className="text-gray-400 text-xs mb-2">{formatLocation(trending.job.location)}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{trending.applicationCount} applications</span>
                        <span>•</span>
                        <span>{trending.viewCount} views</span>
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

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}
