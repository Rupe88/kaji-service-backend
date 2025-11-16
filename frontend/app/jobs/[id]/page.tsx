'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
import { authService } from '@/lib/auth';
import Link from 'next/link';

interface JobPosting {
  id: string;
  title: string;
  description: string;
  location: string;
  salary?: string;
  skills: string[];
  companyName?: string;
  createdAt: string;
  requirements?: string;
  benefits?: string;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<JobPosting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    loadJob();
    checkAuth();
  }, [params.id]);

  const checkAuth = async () => {
    const user = await authService.getCurrentUser();
    setIsAuthenticated(!!user);
  };

  const loadJob = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getJobPosting(params.id as string);
      if (response.success && response.data) {
        setJob(response.data as JobPosting);
      }
    } catch (error) {
      console.error('Failed to load job:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    setIsApplying(true);
    try {
      const response = await apiClient.applyToJob(params.id as string, {});
      if (response.success) {
        alert('Application submitted successfully!');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to apply. Please try again.');
    } finally {
      setIsApplying(false);
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

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600">Job not found</p>
            <Link href="/jobs">
              <Button variant="primary" className="mt-4">
                Browse Jobs
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/jobs" className="text-primary-600 hover:text-primary-700 mb-4 inline-block">
          ← Back to Jobs
        </Link>

        <Card variant="elevated" className="mb-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {job.title}
            </h1>
            {job.companyName && (
              <p className="text-xl text-primary-600 font-medium mb-4">
                {job.companyName}
              </p>
            )}
            <div className="flex flex-wrap gap-4 text-gray-600">
              <span className="flex items-center">
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location}
              </span>
              {job.salary && (
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {job.salary}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-6">
            {job.skills.map((skill, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-primary-100 text-primary-700 text-sm rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleApply}
            isLoading={isApplying}
            className="w-full md:w-auto"
          >
            Apply Now
          </Button>
        </Card>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card variant="elevated" className="mb-6">
              <h2 className="text-2xl font-semibold mb-4">Job Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{job.description}</p>
              </div>
            </Card>

            {job.requirements && (
              <Card variant="elevated" className="mb-6">
                <h2 className="text-2xl font-semibold mb-4">Requirements</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
                </div>
              </Card>
            )}

            {job.benefits && (
              <Card variant="elevated">
                <h2 className="text-2xl font-semibold mb-4">Benefits</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-wrap">{job.benefits}</p>
                </div>
              </Card>
            )}
          </div>

          <div>
            <Card variant="elevated" className="sticky top-4">
              <h3 className="text-lg font-semibold mb-4">Job Summary</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Location:</span>
                  <p className="font-medium">{job.location}</p>
                </div>
                {job.salary && (
                  <div>
                    <span className="text-gray-600">Salary:</span>
                    <p className="font-medium">{job.salary}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">Skills Required:</span>
                  <p className="font-medium">{job.skills.length} skills</p>
                </div>
                <div>
                  <span className="text-gray-600">Posted:</span>
                  <p className="font-medium">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

