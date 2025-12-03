'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { urgentJobsApi } from '@/lib/api-client';
import { DistanceDisplay } from '@/components/urgent-jobs/DistanceDisplay';
import { getCurrentLocation, calculateHaversineDistance } from '@/utils/distance';
import { getProvinces, getDistrictsByProvince } from '@/lib/nepal-locations';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'HAND_TO_HAND', label: 'Hand to Hand' },
  { value: 'CASH_TO_CASH', label: 'Cash to Cash' },
  { value: 'LABOR', label: 'Labor Work' },
  { value: 'OTHER', label: 'Other' },
];

const URGENCY_LEVELS = [
  { value: '', label: 'All Urgency' },
  { value: 'IMMEDIATE', label: 'Immediate' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WITHIN_HOURS', label: 'Within Hours' },
];

const PAYMENT_TYPES = [
  { value: '', label: 'All Payment Types' },
  { value: 'CASH', label: 'Cash' },
  { value: 'DIGITAL', label: 'Digital' },
  { value: 'BOTH', label: 'Both' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'payment-high', label: 'Payment: High to Low' },
  { value: 'payment-low', label: 'Payment: Low to High' },
  { value: 'distance', label: 'Distance: Nearest First' },
  { value: 'urgency', label: 'Most Urgent' },
];

interface UrgentJob {
  id: string;
  title: string;
  description: string;
  category: string;
  province: string;
  district: string;
  city: string;
  ward?: string;
  street?: string;
  latitude?: number | null;
  longitude?: number | null;
  paymentAmount: number;
  paymentType: string;
  urgencyLevel: string;
  status: string;
  maxWorkers: number;
  currentWorkers: number;
  startTime: string;
  endTime?: string | null;
  expiresAt?: string | null;
  contactPhone: string;
  contactMethod?: string;
  imageUrl?: string;
  createdAt: string;
  poster: {
    id: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  };
  applications?: Array<{ id: string; status: string }>;
  distance?: number;
}

function UrgentJobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<UrgentJob[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    urgencyLevel: searchParams.get('urgencyLevel') || '',
    status: searchParams.get('status') || 'OPEN',
    province: searchParams.get('province') || '',
    district: searchParams.get('district') || '',
    city: searchParams.get('city') || '',
    paymentType: searchParams.get('paymentType') || '',
    minPayment: searchParams.get('minPayment') || '',
    maxPayment: searchParams.get('maxPayment') || '',
    radius: searchParams.get('radius') || '50',
    sortBy: searchParams.get('sortBy') || 'newest',
    page: Number(searchParams.get('page')) || 1,
    limit: 20,
  });

  // Get user location on mount
  useEffect(() => {
    const fetchUserLocation = async () => {
      try {
        const location = await getCurrentLocation();
        setUserLocation(location);
        // Update filters with location
        setFilters(prev => ({
          ...prev,
          latitude: location.latitude,
          longitude: location.longitude,
        }));
      } catch (error) {
        console.log('Could not get user location:', error);
      }
    };

    fetchUserLocation();
  }, []);

  // Fetch urgent jobs
  useEffect(() => {
    fetchUrgentJobs();
  }, [filters]);

  const fetchUrgentJobs = async () => {
    setLoading(true);
    try {
      const params: any = {
        page: filters.page,
        limit: filters.limit,
        status: filters.status,
        sortBy: filters.sortBy,
      };

      if (filters.category) params.category = filters.category;
      if (filters.urgencyLevel) params.urgencyLevel = filters.urgencyLevel;
      if (filters.province) params.province = filters.province;
      if (filters.district) params.district = filters.district;
      if (filters.city) params.city = filters.city;
      if (filters.paymentType) params.paymentType = filters.paymentType;
      if (filters.minPayment) params.minPayment = parseFloat(filters.minPayment);
      if (filters.maxPayment) params.maxPayment = parseFloat(filters.maxPayment);
      if (filters.radius) params.radius = parseFloat(filters.radius);

      // Add location if available
      if (userLocation) {
        params.latitude = userLocation.latitude;
        params.longitude = userLocation.longitude;
      }

      const response = await urgentJobsApi.list(params);
      let jobsData = response.data || [];

      // Filter by search query if provided
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        jobsData = jobsData.filter((job: UrgentJob) => {
          return (
            job.title.toLowerCase().includes(query) ||
            job.description.toLowerCase().includes(query) ||
            job.city.toLowerCase().includes(query) ||
            job.district.toLowerCase().includes(query) ||
            getCategoryLabel(job.category).toLowerCase().includes(query)
          );
        });
      }

      // Calculate distances if user location is available
      if (userLocation && jobsData.length > 0) {
        jobsData = jobsData.map((job: UrgentJob) => {
          if (job.latitude && job.longitude) {
            const distance = calculateHaversineDistance(
              userLocation.latitude,
              userLocation.longitude,
              job.latitude,
              job.longitude
            );
            return { ...job, distance };
          }
          return job;
        });

        // Sort by distance if sortBy is 'distance'
        if (filters.sortBy === 'distance') {
          jobsData.sort((a: UrgentJob, b: UrgentJob) => {
            const distA = a.distance || Infinity;
            const distB = b.distance || Infinity;
            return distA - distB;
          });
        }
      }

      setJobs(jobsData);
      setPagination(response.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (error: any) {
      console.error('Error fetching urgent jobs:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch urgent jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsGettingLocation(true);
    try {
      const location = await getCurrentLocation();
      setUserLocation(location);
      setFilters(prev => ({
        ...prev,
        latitude: location.latitude,
        longitude: location.longitude,
        page: 1,
      }));
      toast.success('Location updated');
    } catch (error: any) {
      toast.error('Could not get your location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filter changes
    }));
  };

  const formatPayment = (amount: number, type: string) => {
    return `NPR ${amount.toLocaleString()} (${type})`;
  };

  const getCategoryLabel = (category: string) => {
    return CATEGORIES.find(c => c.value === category)?.label || category;
  };

  const getUrgencyLabel = (urgency: string) => {
    return URGENCY_LEVELS.find(u => u.value === urgency)?.label || urgency;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'IMMEDIATE':
        return 'oklch(0.65 0.2 330)'; // Pink/Red
      case 'TODAY':
        return 'oklch(0.7 0.15 70)'; // Orange
      case 'WITHIN_HOURS':
        return 'oklch(0.8 0.15 90)'; // Yellow
      default:
        return 'oklch(0.7 0.15 180)'; // Teal
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h1 className="text-4xl font-bold text-white mb-2">Urgent Jobs</h1>
                  <p className="text-gray-400">Find immediate work opportunities near you</p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/urgent-jobs/my-jobs')}
                  >
                    My Jobs
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard/urgent-jobs/my-applications')}
                  >
                    My Applications
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => router.push('/dashboard/urgent-jobs/post')}
                  >
                    Post Urgent Job
                  </Button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mb-4">
                <Input
                  placeholder="Search urgent jobs by title, description, location..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setFilters(prev => ({ ...prev, page: 1 }));
                  }}
                  className="w-full"
                />
              </div>

              {/* Location Status */}
              {userLocation && (
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'oklch(0.7 0.15 180 / 0.1)' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" style={{ color: 'oklch(0.7 0.15 180)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-gray-300">
                        Showing jobs within {filters.radius}km of your location
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleUseCurrentLocation}
                      disabled={isGettingLocation}
                      className="text-xs"
                    >
                      {isGettingLocation ? 'Updating...' : 'Update Location'}
                    </Button>
                  </div>
                </div>
              )}

              {!userLocation && (
                <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: 'oklch(0.65 0.2 330 / 0.1)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">
                      Enable location to see distance to jobs
                    </span>
                    <Button
                      variant="outline"
                      onClick={handleUseCurrentLocation}
                      disabled={isGettingLocation}
                      className="text-xs"
                    >
                      {isGettingLocation ? 'Getting...' : 'Use My Location'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 overflow-hidden"
                >
                  <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                  }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
                        <select
                          value={filters.category}
                          onChange={(e) => handleFilterChange('category', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          {CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Urgency Level</label>
                        <select
                          value={filters.urgencyLevel}
                          onChange={(e) => handleFilterChange('urgencyLevel', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          {URGENCY_LEVELS.map(level => (
                            <option key={level.value} value={level.value}>{level.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Payment Type</label>
                        <select
                          value={filters.paymentType}
                          onChange={(e) => handleFilterChange('paymentType', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          {PAYMENT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
                        <select
                          value={filters.sortBy}
                          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          {SORT_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Province</label>
                        <select
                          value={filters.province}
                          onChange={(e) => handleFilterChange('province', e.target.value)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          <option value="">All Provinces</option>
                          {getProvinces().map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">District</label>
                        <select
                          value={filters.district}
                          onChange={(e) => handleFilterChange('district', e.target.value)}
                          disabled={!filters.province}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2 disabled:opacity-50"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          <option value="">{filters.province ? 'All Districts' : 'Select Province first'}</option>
                          {filters.province && getDistrictsByProvince(filters.province).map(d => (
                            <option key={d.value} value={d.value}>{d.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Min Payment (NPR)</label>
                        <Input
                          type="number"
                          value={filters.minPayment}
                          onChange={(e) => handleFilterChange('minPayment', e.target.value)}
                          placeholder="e.g., 1000"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Max Payment (NPR)</label>
                        <Input
                          type="number"
                          value={filters.maxPayment}
                          onChange={(e) => handleFilterChange('maxPayment', e.target.value)}
                          placeholder="e.g., 10000"
                        />
                      </div>
                    </div>

                    <div className="mt-4 flex gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setFilters({
                            category: '',
                            urgencyLevel: '',
                            status: 'OPEN',
                            province: '',
                            district: '',
                            city: '',
                            paymentType: '',
                            minPayment: '',
                            maxPayment: '',
                            radius: '50',
                            sortBy: 'newest',
                            page: 1,
                            limit: 20,
                          });
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Jobs List */}
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180)' }}></div>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 text-lg mb-4">No urgent jobs found</p>
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard/urgent-jobs/post')}
                >
                  Post the First Urgent Job
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {jobs.map((job) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border-2 backdrop-blur-xl p-6 cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                      onClick={() => router.push(`/dashboard/urgent-jobs/${job.id}`)}
                    >
                      {/* Urgency Badge */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-3 py-1 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: `${getUrgencyColor(job.urgencyLevel)} / 0.2`,
                            color: getUrgencyColor(job.urgencyLevel),
                          }}
                        >
                          {getUrgencyLabel(job.urgencyLevel)}
                        </span>
                        {job.distance !== undefined && userLocation && (
                          <DistanceDisplay distance={job.distance} />
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{job.title}</h3>

                      {/* Category */}
                      <p className="text-sm text-gray-400 mb-3">{getCategoryLabel(job.category)}</p>

                      {/* Description */}
                      <p className="text-sm text-gray-300 mb-4 line-clamp-2">{job.description}</p>

                      {/* Payment */}
                      <div className="flex items-center gap-2 mb-3">
                        <svg className="w-5 h-5" style={{ color: 'oklch(0.7 0.15 180)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-lg font-semibold" style={{ color: 'oklch(0.7 0.15 180)' }}>
                          {formatPayment(job.paymentAmount, job.paymentType)}
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{job.city}, {job.district}</span>
                      </div>

                      {/* Workers */}
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-400">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>{job.currentWorkers}/{job.maxWorkers} workers</span>
                      </div>

                      {/* Start Time */}
                      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{new Date(job.startTime).toLocaleString()}</span>
                      </div>

                      {/* View Details Button */}
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/urgent-jobs/${job.id}`);
                        }}
                      >
                        View Details
                      </Button>
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={filters.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-gray-400">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={filters.page >= pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function UrgentJobsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    }>
      <UrgentJobsContent />
    </Suspense>
  );
}

