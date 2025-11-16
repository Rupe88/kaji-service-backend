'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { authService } from '@/lib/auth';
import { apiClient } from '@/lib/api';
import Link from 'next/link';

interface Application {
  id: string;
  job: {
    id: string;
    title: string;
    companyName?: string;
  };
  status: string;
  appliedAt: string;
  coverLetter?: string;
}

export default function ApplicationsPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const user = await authService.getCurrentUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const response = await apiClient.getMyApplications();
      if (response.success && response.data) {
        const data = response.data as any;
        setApplications(Array.isArray(data) ? data : (data.applications || []));
      }
    } catch (error) {
      console.error('Failed to load applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            My Applications
          </h1>
          <p className="text-gray-600">
            Track the status of your job applications
          </p>
        </div>

        {applications.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">You haven't applied to any jobs yet.</p>
              <Link href="/jobs">
                <Button variant="primary">
                  Browse Jobs
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <Card key={application.id} variant="elevated">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <Link href={`/jobs/${application.job.id}`}>
                      <h3 className="text-xl font-semibold text-gray-900 hover:text-primary-600 mb-2">
                        {application.job.title}
                      </h3>
                    </Link>
                    {application.job.companyName && (
                      <p className="text-primary-600 mb-2">
                        {application.job.companyName}
                      </p>
                    )}
                    <p className="text-sm text-gray-500">
                      Applied on {new Date(application.appliedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                    {application.status}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

