'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { jobsApi, applicationsApi, kycApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { JobPosting } from '@/types/api';

// Extended interface for the API response which includes employer and _count
interface JobPostingWithDetails extends JobPosting {
  employer?: {
    companyName: string;
    industrySector?: string;
    province?: string;
    district?: string;
  };
  _count?: {
    applications: number;
  };
}

const JOB_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'FULL_TIME_1YEAR', label: 'Full Time (1 Year)' },
  { value: 'FULL_TIME_2YEAR', label: 'Full Time (2 Years)' },
  { value: 'FULL_TIME_2YEAR_PLUS', label: 'Full Time (2+ Years)' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'HOURLY_PAY', label: 'Hourly Pay' },
  { value: 'DAILY_PAY', label: 'Daily Pay' },
];

const PROVINCES = [
  { value: '', label: 'All Provinces' },
  { value: '1', label: 'Province 1' },
  { value: '2', label: 'Province 2' },
  { value: '3', label: 'Bagmati' },
  { value: '4', label: 'Gandaki' },
  { value: '5', label: 'Lumbini' },
  { value: '6', label: 'Karnali' },
  { value: '7', label: 'Sudurpashchim' },
];

const EDUCATION_LEVELS = [
  { value: '', label: 'All Education Levels' },
  { value: 'High School', label: 'High School' },
  { value: 'Diploma', label: 'Diploma' },
  { value: 'Bachelors', label: "Bachelor's Degree" },
  { value: 'Masters', label: "Master's Degree" },
  { value: 'PhD', label: 'PhD' },
  { value: 'Other', label: 'Other' },
];

const EXPERIENCE_OPTIONS = [
  { value: '', label: 'Any Experience' },
  { value: '0', label: 'Entry Level (0 years)' },
  { value: '1', label: '1+ years' },
  { value: '2', label: '2+ years' },
  { value: '3', label: '3+ years' },
  { value: '5', label: '5+ years' },
  { value: '10', label: '10+ years' },
];

const CONTRACT_DURATION_OPTIONS = [
  { value: '', label: 'Any Duration' },
  { value: '1', label: '1 month' },
  { value: '3', label: '3 months' },
  { value: '6', label: '6 months' },
  { value: '12', label: '1 year' },
  { value: '24', label: '2 years' },
  { value: '36', label: '3+ years' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'salary-high', label: 'Salary: High to Low' },
  { value: 'salary-low', label: 'Salary: Low to High' },
];

const SALARY_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'YEARLY', label: 'Yearly' },
];

const DATE_POSTED_OPTIONS = [
  { value: '', label: 'Any Time' },
  { value: '1', label: 'Last 24 Hours' },
  { value: '7', label: 'Last Week' },
  { value: '30', label: 'Last Month' },
  { value: '90', label: 'Last 3 Months' },
];

const COMMON_SKILLS = [
  'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'HTML/CSS',
  'TypeScript', 'Angular', 'Vue.js', 'PHP', 'C++', 'C#', '.NET',
  'AWS', 'Docker', 'Kubernetes', 'Git', 'MongoDB', 'PostgreSQL',
  'Communication', 'Leadership', 'Problem Solving', 'Teamwork',
];

const QUICK_FILTERS = [
  {
    label: 'Remote Jobs',
    filters: { isRemote: 'true' },
    icon: '🌐',
  },
  {
    label: 'Entry Level',
    filters: { experienceYears: '0', jobType: 'INTERNSHIP' },
    icon: '🎓',
  },
  {
    label: 'High Salary',
    filters: { minSalary: '50000', sortBy: 'salary-high' },
    icon: '💰',
  },
  {
    label: 'Full Time',
    filters: { jobType: 'FULL_TIME_1YEAR' },
    icon: '💼',
  },
  {
    label: 'Part Time',
    filters: { jobType: 'PART_TIME' },
    icon: '⏰',
  },
  {
    label: 'Recent Jobs',
    filters: { datePosted: '7', sortBy: 'newest' },
    icon: '🆕',
  },
];

function JobsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobPostingWithDetails[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [kycApproved, setKycApproved] = useState(false);
  const [kycStatus, setKycStatus] = useState<'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' | null>(null);
  const [userApplications, setUserApplications] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    jobType: searchParams.get('jobType') || '',
    province: searchParams.get('province') || '',
    district: searchParams.get('district') || '',
    city: searchParams.get('city') || '',
    isRemote: searchParams.get('isRemote') || '',
    minSalary: searchParams.get('minSalary') || '',
    maxSalary: searchParams.get('maxSalary') || '',
    experienceYears: searchParams.get('experienceYears') || '',
    educationLevel: searchParams.get('educationLevel') || '',
    contractDuration: searchParams.get('contractDuration') || '',
    industrySector: searchParams.get('industrySector') || '',
    salaryType: searchParams.get('salaryType') || '',
    datePosted: searchParams.get('datePosted') || '',
    verifiedOnly: searchParams.get('verifiedOnly') || '', // Default to showing all active jobs
    sortBy: searchParams.get('sortBy') || 'newest',
  });

  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(Number(searchParams.get('page')) || 1);

  // Check KYC status
  useEffect(() => {
    const checkKYC = async () => {
      if (!user?.id || !user?.role) return;
      try {
        const kycData = await kycApi.getKYC(user.id, user.role);
        if (!kycData) {
          // No KYC submitted
          setKycStatus('NONE');
          setKycApproved(false);
        } else {
          // KYC exists, check status
          const status = kycData.status || 'PENDING';
          setKycStatus(status);
          setKycApproved(status === 'APPROVED');
        }
      } catch (error) {
        // Error fetching KYC - assume no KYC
        setKycStatus('NONE');
        setKycApproved(false);
      }
    };
    checkKYC();
  }, [user?.id, user?.role]);

  // Fetch user applications
  useEffect(() => {
    const fetchApplications = async () => {
      if (!user?.id) return;
      try {
        const applications = await applicationsApi.getByUser(user.id);
        const jobIds = new Set(applications.map((app: any) => app.jobId || app.job?.id).filter(Boolean));
        setUserApplications(jobIds);
      } catch (error) {
        // User might not have applications yet
      }
    };
    fetchApplications();
  }, [user?.id]);

  // Fetch jobs
  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 12,
      };

      if (filters.search) params.search = filters.search;
      if (filters.jobType) params.jobType = filters.jobType;
      if (filters.province) params.province = filters.province;
      if (filters.district) params.district = filters.district;
      if (filters.city) params.city = filters.city;
      if (filters.isRemote) params.isRemote = filters.isRemote;
      if (filters.minSalary) params.minSalary = filters.minSalary;
      if (filters.maxSalary) params.maxSalary = filters.maxSalary;
      if (filters.experienceYears) params.experienceYears = filters.experienceYears;
      if (filters.educationLevel) params.educationLevel = filters.educationLevel;
      if (filters.contractDuration) params.contractDuration = filters.contractDuration;
      if (filters.industrySector) params.industrySector = filters.industrySector;
      if (filters.salaryType) params.salaryType = filters.salaryType;
      if (filters.datePosted) params.datePosted = filters.datePosted;
      if (filters.verifiedOnly === 'true') params.verifiedOnly = 'true'; // Only pass if explicitly true
      if (filters.sortBy) params.sortBy = filters.sortBy;

      const response = await jobsApi.list(params);
      setJobs((response.data || []) as JobPostingWithDetails[]);
      setPagination(response.pagination || { page: 1, limit: 12, total: 0, pages: 1 });
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to load jobs');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.search) params.set('q', filters.search);
    if (filters.jobType) params.set('jobType', filters.jobType);
    if (filters.province) params.set('province', filters.province);
    if (filters.district) params.set('district', filters.district);
    if (filters.city) params.set('city', filters.city);
    if (filters.isRemote) params.set('isRemote', filters.isRemote);
    if (filters.minSalary) params.set('minSalary', filters.minSalary);
    if (filters.maxSalary) params.set('maxSalary', filters.maxSalary);
    if (filters.experienceYears) params.set('experienceYears', filters.experienceYears);
    if (filters.educationLevel) params.set('educationLevel', filters.educationLevel);
    if (filters.contractDuration) params.set('contractDuration', filters.contractDuration);
    if (filters.industrySector) params.set('industrySector', filters.industrySector);
    if (filters.salaryType) params.set('salaryType', filters.salaryType);
    if (filters.datePosted) params.set('datePosted', filters.datePosted);
    if (filters.verifiedOnly === 'true') params.set('verifiedOnly', 'true');
    // Don't set verifiedOnly if it's empty (shows all active jobs)
    if (filters.sortBy && filters.sortBy !== 'newest') params.set('sortBy', filters.sortBy);
    if (currentPage > 1) params.set('page', currentPage.toString());

    router.replace(`/dashboard/jobs?${params.toString()}`, { scroll: false });
  }, [filters, currentPage, router]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchJobs();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      jobType: '',
      province: '',
      district: '',
      city: '',
      isRemote: '',
      minSalary: '',
      maxSalary: '',
      experienceYears: '',
      educationLevel: '',
      contractDuration: '',
      industrySector: '',
      salaryType: '',
      datePosted: '',
      verifiedOnly: 'true',
      sortBy: 'newest',
    });
    setSelectedSkills([]);
    setCurrentPage(1);
  };

  const applyQuickFilter = (quickFilter: typeof QUICK_FILTERS[0]) => {
    setFilters(prev => ({ ...prev, ...quickFilter.filters }));
    setCurrentPage(1);
  };

  const removeFilter = (key: string) => {
    setFilters(prev => ({ ...prev, [key]: key === 'sortBy' ? 'newest' : '' }));
    setCurrentPage(1);
  };

  const getFilterLabel = (key: string, value: string): string => {
    if (!value) return '';
    switch (key) {
      case 'jobType':
        return JOB_TYPES.find(t => t.value === value)?.label || value;
      case 'province':
        return PROVINCES.find(p => p.value === value)?.label || value;
      case 'educationLevel':
        return EDUCATION_LEVELS.find(e => e.value === value)?.label || value;
      case 'experienceYears':
        return EXPERIENCE_OPTIONS.find(e => e.value === value)?.label || `${value} years`;
      case 'contractDuration':
        return CONTRACT_DURATION_OPTIONS.find(c => c.value === value)?.label || `${value} months`;
      case 'datePosted':
        return DATE_POSTED_OPTIONS.find(d => d.value === value)?.label || value;
      case 'sortBy':
        return SORT_OPTIONS.find(s => s.value === value)?.label || value;
      case 'isRemote':
        return 'Remote Work';
      case 'salaryType':
        return SALARY_TYPE_OPTIONS.find(s => s.value === value)?.label || value;
      case 'verifiedOnly':
        return value === 'true' ? 'Verified Only' : 'All Jobs';
      default:
        return value;
    }
  };

  const activeFilterChips = Object.entries(filters)
    .filter(([key, value]) => {
      if (key === 'sortBy') return value && value !== 'newest';
      if (key === 'verifiedOnly') return value === 'true'; // Only show if explicitly 'true'
      return value && value !== '';
    })
    .map(([key, value]) => ({ key, value, label: getFilterLabel(key, value as string) }));

  const formatSalary = (job: JobPostingWithDetails) => {
    if (!job.salaryRange?.min && !job.salaryRange?.max) return 'Salary not specified';
    const min = job.salaryRange?.min?.toLocaleString() || '0';
    const max = job.salaryRange?.max?.toLocaleString() || '0';
    return `Rs. ${min} - ${max} ${job.salaryRange?.currency || 'per month'}`;
  };

  const formatLocation = (job: JobPostingWithDetails) => {
    if (job.location) {
      const parts = [
        job.location.municipality,
        job.location.district,
        job.location.province
      ].filter(Boolean);
      return parts.join(', ') || 'Location not specified';
    }
    return 'Location not specified';
  };

  const formatJobType = (jobType: string) => {
    return jobType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'sortBy') return value && value !== 'newest';
    return value && value !== '';
  });

  if (loading && jobs.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading jobs...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Job Listings</h1>
              <p className="text-gray-400">
                {pagination.total > 0 
                  ? `Found ${pagination.total} job${pagination.total !== 1 ? 's' : ''}`
                  : 'No jobs found'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Search jobs by title or description..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="primary" size="md">
                Search
              </Button>
            </div>
          </form>

          {/* Quick Filter Chips */}
          <div className="mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-gray-400 mr-2">Quick filters:</span>
              {QUICK_FILTERS.map((quickFilter, index) => {
                const isActive = Object.entries(quickFilter.filters).every(([key, value]) => {
                  return filters[key as keyof typeof filters] === value;
                });
                return (
                  <button
                    key={index}
                    onClick={() => applyQuickFilter(quickFilter)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? 'text-white bg-teal-500 border-2 border-teal-400'
                        : 'text-gray-300 bg-gray-800/50 border-2 border-gray-700 hover:border-teal-500/50 hover:text-teal-400'
                    }`}
                  >
                    {quickFilter.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sort and Active Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-400 whitespace-nowrap">Sort by:</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Filter Chips */}
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-400">Active filters:</span>
                {activeFilterChips.map(({ key, value, label }) => (
                  <button
                    key={key}
                    onClick={() => removeFilter(key)}
                    className="px-3 py-1 rounded-full text-xs font-medium text-teal-400 bg-teal-500/20 border border-teal-500/30 hover:bg-teal-500/30 transition-colors flex items-center gap-2"
                  >
                    <span>{label}</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                ))}
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 rounded-full text-xs font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className={`lg:col-span-1 ${showFilters ? 'block' : 'hidden lg:block'}`}>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl sticky top-24"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Filters</h2>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-teal-400 hover:text-teal-300 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
                {/* Job Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Job Type</label>
                  <select
                    value={filters.jobType}
                    onChange={(e) => handleFilterChange('jobType', e.target.value)}
                    className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                  >
                    {JOB_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Location Filters */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Location</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Province</label>
                      <select
                        value={filters.province}
                        onChange={(e) => handleFilterChange('province', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {PROVINCES.map((province) => (
                          <option key={province.value} value={province.value}>
                            {province.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">District</label>
                      <Input
                        type="text"
                        placeholder="Enter district..."
                        value={filters.district}
                        onChange={(e) => handleFilterChange('district', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">City</label>
                      <Input
                        type="text"
                        placeholder="Enter city..."
                        value={filters.city}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filters.isRemote === 'true'}
                          onChange={(e) => handleFilterChange('isRemote', e.target.checked ? 'true' : '')}
                          className="w-5 h-5 rounded border-2"
                          style={{
                            backgroundColor: filters.isRemote === 'true' ? 'oklch(0.7 0.15 180)' : 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                          }}
                        />
                        <span className="text-sm text-gray-300">Remote Work Only</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Salary Range */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Compensation</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Min Salary (Rs.)</label>
                      <Input
                        type="number"
                        placeholder="Minimum salary"
                        value={filters.minSalary}
                        onChange={(e) => handleFilterChange('minSalary', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Max Salary (Rs.)</label>
                      <Input
                        type="number"
                        placeholder="Maximum salary"
                        value={filters.maxSalary}
                        onChange={(e) => handleFilterChange('maxSalary', e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Experience & Education */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Requirements</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Experience</label>
                      <select
                        value={filters.experienceYears}
                        onChange={(e) => handleFilterChange('experienceYears', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {EXPERIENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Education Level</label>
                      <select
                        value={filters.educationLevel}
                        onChange={(e) => handleFilterChange('educationLevel', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {EDUCATION_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Contract & Industry */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wide">Additional</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Contract Duration</label>
                      <select
                        value={filters.contractDuration}
                        onChange={(e) => handleFilterChange('contractDuration', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {CONTRACT_DURATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Industry Sector</label>
                      <Input
                        type="text"
                        placeholder="e.g., IT, Healthcare, Finance..."
                        value={filters.industrySector}
                        onChange={(e) => handleFilterChange('industrySector', e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Date Posted</label>
                      <select
                        value={filters.datePosted}
                        onChange={(e) => handleFilterChange('datePosted', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {DATE_POSTED_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Jobs List */}
          <div className="lg:col-span-3">
            {jobs.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <h3 className="text-2xl font-bold text-white mb-2">No jobs found</h3>
                <p className="text-gray-400 mb-6">
                  {hasActiveFilters 
                    ? 'Try adjusting your filters to see more results'
                    : 'Check back later for new job postings'}
                </p>
                {hasActiveFilters && (
                  <Button onClick={clearFilters} variant="outline">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  <AnimatePresence>
                    {jobs.map((job, index) => {
                      const hasApplied = userApplications.has(job.id);
                      const isExpired = job.expiresAt && new Date(job.expiresAt) < new Date();
                      // Note: numberOfPositions is the total, we don't have filledPositions in the type
                      // So we'll just show the total positions
                      const positionsAvailable = job.numberOfPositions || 1;

                      return (
                        <motion.div
                          key={job.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-6 rounded-2xl border-2 backdrop-blur-xl hover:border-teal-500/50 transition-all cursor-pointer"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                          }}
                          onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                        >
                          <div className="flex flex-col lg:flex-row gap-4">
                            {/* Job Info */}
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h3 className="text-xl font-bold text-white mb-1 hover:text-teal-400 transition-colors">
                                    {job.title}
                                  </h3>
                                  {job.employer && (
                                    <p className="text-lg text-gray-300 mb-2">{job.employer.companyName}</p>
                                  )}
                                </div>
                                {job.verified && (
                                  <div className="px-3 py-1 rounded-lg bg-green-500/20 border border-green-500/30 flex-shrink-0">
                                    <span className="text-green-400 text-xs font-semibold">Verified</span>
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-4">
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  <span>{formatLocation(job)}</span>
                                </div>
                                {job.remoteWork && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <span>Remote</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{formatSalary(job)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                  <span>{formatJobType(job.jobType)}</span>
                                </div>
                              </div>

                              <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                                {job.description ? (
                                  typeof job.description === 'string' && job.description.startsWith('<')
                                    ? job.description.replace(/<[^>]*>/g, '').substring(0, 150) + (job.description.length > 150 ? '...' : '')
                                    : job.description.substring(0, 150) + (job.description.length > 150 ? '...' : '')
                                ) : 'No description available'}
                              </p>

                              <div className="flex flex-wrap items-center gap-3 text-xs">
                                {job._count && job._count.applications > 0 && (
                                  <span className="px-2 py-1 rounded bg-gray-800/50 text-gray-400">
                                    {job._count.applications} application{job._count.applications !== 1 ? 's' : ''}
                                  </span>
                                )}
                                {positionsAvailable > 0 && (
                                  <span className="px-2 py-1 rounded bg-teal-500/20 text-teal-400">
                                    {positionsAvailable} position{positionsAvailable !== 1 ? 's' : ''} available
                                  </span>
                                )}
                                {isExpired && (
                                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
                                    Expired
                                  </span>
                                )}
                                {job.status === 'EXPIRED' && (
                                  <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">
                                    Expired
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 lg:min-w-[140px]">
                              <Link
                                href={`/dashboard/jobs/${job.id}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Button variant="outline" size="sm" className="w-full">
                                  View Details
                                </Button>
                              </Link>
                              {/* Only show Apply button for individual users */}
                              {user?.role === 'INDIVIDUAL' ? (
                                hasApplied ? (
                                  <Button variant="outline" size="sm" className="w-full" disabled>
                                    Applied
                                  </Button>
                                ) : (
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="w-full"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Check KYC status
                                      if (kycStatus === 'NONE' || !kycStatus) {
                                        // No KYC submitted - redirect to KYC page
                                        toast.error('Please complete KYC verification to apply for jobs');
                                        router.push('/kyc/individual');
                                      } else if (kycStatus === 'PENDING') {
                                        // KYC is pending - show message, don't redirect
                                        toast.error('Your KYC is pending. Please wait for admin approval before applying to jobs.');
                                      } else if (kycStatus === 'REJECTED') {
                                        // KYC was rejected - redirect to resubmit
                                        toast.error('Your KYC was rejected. Please resubmit your KYC to apply for jobs.');
                                        router.push('/kyc/individual');
                                      } else if (!kycApproved || kycStatus !== 'APPROVED') {
                                        // Fallback
                                        toast.error('Please complete KYC verification to apply for jobs');
                                        router.push('/kyc/individual');
                                      } else {
                                        // KYC approved - navigate to job detail page
                                        router.push(`/dashboard/jobs/${job.id}`);
                                      }
                                    }}
                                    disabled={isExpired || job.status === 'EXPIRED' || job.status === 'INACTIVE'}
                                  >
                                    {isExpired || job.status === 'EXPIRED' ? 'Expired' : job.status === 'INACTIVE' ? 'Inactive' : 'Apply Now'}
                                  </Button>
                                )
                              ) : user?.role === 'INDUSTRIAL' ? (
                                <Button variant="outline" size="sm" className="w-full" disabled>
                                  View Only
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/dashboard/jobs/${job.id}`);
                                  }}
                                >
                                  View Details
                                </Button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-gray-800/50">
                    <p className="text-gray-400 text-sm">
                      Showing {((currentPage - 1) * pagination.limit) + 1} to {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} jobs
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="text-gray-400 text-sm px-4">
                        Page {currentPage} of {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(pagination.pages, p + 1))}
                        disabled={currentPage === pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function JobsPageContent() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading...</div>
          </div>
        </div>
      </DashboardLayout>
    }>
      <JobsContent />
    </Suspense>
  );
}

export default function JobsPage() {
  return (
    <ProtectedRoute>
      <JobsPageContent />
    </ProtectedRoute>
  );
}
