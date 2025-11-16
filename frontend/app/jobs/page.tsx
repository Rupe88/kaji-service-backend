'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api';
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
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [location, setLocation] = useState('');

  useEffect(() => {
    loadJobs();
  }, [search, location]);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.getJobPostings({
        search: search || undefined,
        location: location || undefined,
      });
      if (response.success && response.data) {
        const data = response.data as any;
        setJobs(Array.isArray(data) ? data : (data.jobs || []));
      }
    } catch (error) {
      console.error('Failed to load jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Find Your Dream Job
          </h1>
          <p className="text-gray-600">
            Discover opportunities that match your skills
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Input
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <Button variant="primary" onClick={loadJobs}>
            Search
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading jobs...</p>
          </div>
        ) : jobs.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600">No jobs found. Try adjusting your search.</p>
            </div>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Link key={job.id} href={`/jobs/${job.id}`}>
                <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer h-full">
                  <h3 className="text-xl font-semibold mb-2 text-gray-900">
                    {job.title}
                  </h3>
                  {job.companyName && (
                    <p className="text-primary-600 font-medium mb-2">
                      {job.companyName}
                    </p>
                  )}
                  <p className="text-gray-600 mb-4 line-clamp-3">
                    {job.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.skills.slice(0, 3).map((skill, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-primary-100 text-primary-700 text-xs rounded"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.skills.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                        +{job.skills.length - 3} more
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>{job.location}</span>
                    {job.salary && <span className="font-medium">{job.salary}</span>}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

