'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authService, User } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (!currentUser) {
          router.push('/auth/login');
          return;
        }
        setUser(currentUser);

        // Load dashboard stats
        try {
          const statsResponse = await apiClient.getDashboardStats();
          if (statsResponse.success) {
            setStats(statsResponse.data);
          }
        } catch (error) {
          console.error('Failed to load stats:', error);
        }
      } catch (error) {
        router.push('/auth/login');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user.firstName}!
          </h1>
          <p className="text-gray-600 mt-2">
            {user.role === 'INDIVIDUAL' 
              ? 'Find your next opportunity' 
              : 'Manage your job postings and candidates'}
          </p>
        </div>

        {stats && (
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {user.role === 'INDIVIDUAL' ? (
              <>
                <Card variant="elevated">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-2">
                      {stats.totalApplications || 0}
                    </div>
                    <div className="text-gray-600">Applications</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary-600 mb-2">
                      {stats.activeApplications || 0}
                    </div>
                    <div className="text-gray-600">Active Applications</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {stats.matchedJobs || 0}
                    </div>
                    <div className="text-gray-600">Matched Jobs</div>
                  </div>
                </Card>
              </>
            ) : (
              <>
                <Card variant="elevated">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary-600 mb-2">
                      {stats.totalJobs || 0}
                    </div>
                    <div className="text-gray-600">Job Postings</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary-600 mb-2">
                      {stats.totalApplications || 0}
                    </div>
                    <div className="text-gray-600">Total Applications</div>
                  </div>
                </Card>
                <Card variant="elevated">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      {stats.activeJobs || 0}
                    </div>
                    <div className="text-gray-600">Active Jobs</div>
                  </div>
                </Card>
              </>
            )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {user.role === 'INDIVIDUAL' ? (
            <>
              <Card variant="elevated">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link href="/jobs">
                    <Button variant="primary" className="w-full">
                      Browse Jobs
                    </Button>
                  </Link>
                  <Link href="/dashboard/applications">
                    <Button variant="outline" className="w-full">
                      View Applications
                    </Button>
                  </Link>
                  <Link href="/dashboard/profile">
                    <Button variant="outline" className="w-full">
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card variant="elevated">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <p className="text-gray-600">No recent activity</p>
              </Card>
            </>
          ) : (
            <>
              <Card variant="elevated">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-3">
                  <Link href="/dashboard/jobs/create">
                    <Button variant="primary" className="w-full">
                      Post New Job
                    </Button>
                  </Link>
                  <Link href="/dashboard/jobs">
                    <Button variant="outline" className="w-full">
                      Manage Jobs
                    </Button>
                  </Link>
                  <Link href="/dashboard/applications">
                    <Button variant="outline" className="w-full">
                      View Applications
                    </Button>
                  </Link>
                </div>
              </Card>

              <Card variant="elevated">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <p className="text-gray-600">No recent activity</p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

