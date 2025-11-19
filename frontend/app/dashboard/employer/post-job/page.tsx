'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { jobsApi, kycApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

const JOB_TYPES = [
  { value: 'INTERNSHIP', label: 'Internship' },
  { value: 'PART_TIME', label: 'Part Time' },
  { value: 'HOURLY_PAY', label: 'Hourly Pay' },
  { value: 'DAILY_PAY', label: 'Daily Pay' },
  { value: 'FULL_TIME_1YEAR', label: 'Full Time (1 Year)' },
  { value: 'FULL_TIME_2YEAR', label: 'Full Time (2 Years)' },
  { value: 'FULL_TIME_2YEAR_PLUS', label: 'Full Time (2+ Years)' },
];

const PROVINCES = [
  { value: '1', label: 'Province 1' },
  { value: '2', label: 'Province 2' },
  { value: '3', label: 'Bagmati' },
  { value: '4', label: 'Gandaki' },
  { value: '5', label: 'Lumbini' },
  { value: '6', label: 'Karnali' },
  { value: '7', label: 'Sudurpashchim' },
];

const SALARY_TYPES = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'YEARLY', label: 'Yearly' },
];

interface JobFormData {
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  jobType: string;
  country: string;
  province: string;
  district: string;
  city: string;
  isRemote: boolean;
  salaryMin: string;
  salaryMax: string;
  salaryType: string;
  contractDuration: string;
  experienceYears: string;
  educationLevel: string;
  totalPositions: string;
  expiresAt: string;
  requiredSkills: string; // JSON string for skills
  isActive: boolean;
}

interface Skill {
  name: string;
  proficiency: number; // 1-5
}

function PostJobContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [kycApproved, setKycApproved] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillProficiency, setNewSkillProficiency] = useState('3');
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    requirements: '',
    responsibilities: '',
    jobType: 'FULL_TIME_1YEAR',
    country: 'Nepal',
    province: '',
    district: '',
    city: '',
    isRemote: false,
    salaryMin: '',
    salaryMax: '',
    salaryType: 'MONTHLY',
    contractDuration: '',
    experienceYears: '',
    educationLevel: '',
    totalPositions: '1',
    expiresAt: '',
    requiredSkills: '{}',
    isActive: true,
  });

  useEffect(() => {
    checkKYCStatus();
  }, [user?.id, user?.role]);

  const checkKYCStatus = async () => {
    if (!user?.id || user?.role !== 'INDUSTRIAL') return;
    try {
      const kycData = await kycApi.getKYC(user.id, 'INDUSTRIAL');
      setKycApproved(kycData?.status === 'APPROVED');
      if (kycData?.status !== 'APPROVED') {
        toast.error('Your industrial KYC must be approved to post jobs');
        router.push('/kyc/industrial');
      }
    } catch (error) {
      setKycApproved(false);
    }
  };

  const handleChange = (field: keyof JobFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (!newSkillName.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    // Check if skill already exists
    if (skills.some(s => s.name.toLowerCase() === newSkillName.trim().toLowerCase())) {
      toast.error('This skill is already added');
      return;
    }

    setSkills([...skills, { name: newSkillName.trim(), proficiency: parseInt(newSkillProficiency) }]);
    setNewSkillName('');
    setNewSkillProficiency('3');
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const updateSkillProficiency = (index: number, proficiency: number) => {
    const updatedSkills = [...skills];
    updatedSkills[index].proficiency = proficiency;
    setSkills(updatedSkills);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    if (!kycApproved) {
      toast.error('Your industrial KYC must be approved to post jobs');
      router.push('/kyc/industrial');
      return;
    }

    // Helper function to strip HTML and get text length
    const getTextLength = (html: string): number => {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent?.trim().length || 0;
    };

    // Validation
    if (!formData.title.trim()) {
      toast.error('Job title is required');
      return;
    }

    const descriptionLength = getTextLength(formData.description);
    if (!formData.description.trim() || descriptionLength < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    const requirementsLength = getTextLength(formData.requirements);
    if (!formData.requirements.trim() || requirementsLength < 10) {
      toast.error('Requirements must be at least 10 characters');
      return;
    }

    if (!formData.province || !formData.district || !formData.city) {
      toast.error('Location details are required');
      return;
    }

    // Validate skills
    if (skills.length === 0) {
      toast.error('At least one required skill must be specified');
      return;
    }

    // Convert skills array to object format { skillName: proficiency }
    const requiredSkillsObj: Record<string, number> = {};
    skills.forEach(skill => {
      if (skill.name.trim()) {
        requiredSkillsObj[skill.name.trim()] = skill.proficiency;
      }
    });

    if (Object.keys(requiredSkillsObj).length === 0) {
      toast.error('At least one required skill must be specified');
      return;
    }

    // Validate expiration date if provided
    if (formData.expiresAt) {
      const expiryDate = new Date(formData.expiresAt);
      const now = new Date();
      if (expiryDate <= now) {
        toast.error('Expiration date must be in the future');
        return;
      }
    }

    setLoading(true);
    try {
      const jobData: any = {
        employerId: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        requirements: formData.requirements.trim(),
        jobType: formData.jobType,
        country: formData.country,
        province: formData.province,
        district: formData.district,
        city: formData.city,
        isRemote: formData.isRemote,
        requiredSkills: requiredSkillsObj,
      };

      if (formData.responsibilities.trim()) {
        jobData.responsibilities = formData.responsibilities.trim();
      }

      if (formData.salaryMin) {
        jobData.salaryMin = parseInt(formData.salaryMin);
      }

      if (formData.salaryMax) {
        jobData.salaryMax = parseInt(formData.salaryMax);
      }

      if (formData.salaryType) {
        jobData.salaryType = formData.salaryType;
      }

      if (formData.contractDuration) {
        jobData.contractDuration = parseInt(formData.contractDuration);
      }

      if (formData.experienceYears) {
        jobData.experienceYears = parseInt(formData.experienceYears);
      }

      if (formData.educationLevel.trim()) {
        jobData.educationLevel = formData.educationLevel.trim();
      }

      if (formData.totalPositions) {
        jobData.totalPositions = parseInt(formData.totalPositions);
      }

      if (formData.expiresAt) {
        const expiryDate = new Date(formData.expiresAt);
        jobData.expiresAt = expiryDate.toISOString();
      }

      jobData.isActive = formData.isActive;

      await jobsApi.create(jobData);
      toast.success('Job posted successfully!');
      router.push('/dashboard/employer/jobs');
    } catch (error: any) {
      console.error('Error posting job:', error);
      console.error('Error response:', error.response?.data);
      
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        // Show detailed validation errors
        const errorMessages = error.response.data.errors.map((e: any) => {
          const field = e.path || 'field';
          return `${field}: ${e.message}`;
        }).join('\n');
        
        // Show first error as toast, and log all errors
        const firstError = error.response.data.errors[0];
        toast.error(`${firstError.path || 'Validation'}: ${firstError.message}`, {
          duration: 5000,
        });
        
        // Log all errors to console for debugging
        console.error('All validation errors:', error.response.data.errors);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Failed to post job. Please check the console for details.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'INDUSTRIAL') {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">This page is only available for employers</p>
            <Link href="/dashboard">
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard/employer/jobs">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to My Jobs</span>
              </motion.button>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Post a New Job</h1>
            <p className="text-gray-400">Fill in the details to post your job opening</p>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Basic Information */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-6">Basic Information</h2>
              <div className="space-y-4">
                <Input
                  label="Job Title *"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Senior Software Engineer"
                  required
                  disabled={loading}
                />

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Job Type *</label>
                  <select
                    value={formData.jobType}
                    onChange={(e) => handleChange('jobType', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                    required
                    disabled={loading}
                  >
                    {JOB_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <RichTextEditor
                  label="Job Description *"
                  value={formData.description}
                  onChange={(value) => handleChange('description', value)}
                  placeholder="Describe the role, responsibilities, and what makes this opportunity great..."
                  disabled={loading}
                  minHeight={200}
                  helperText="Use the toolbar to format your text with headings, lists, bold, italic, and links."
                />

                <RichTextEditor
                  label="Requirements *"
                  value={formData.requirements}
                  onChange={(value) => handleChange('requirements', value)}
                  placeholder="List the required skills, experience, and qualifications..."
                  disabled={loading}
                  minHeight={200}
                  helperText="Format your requirements with lists, headings, and emphasis."
                />

                <RichTextEditor
                  label="Responsibilities (Optional)"
                  value={formData.responsibilities}
                  onChange={(value) => handleChange('responsibilities', value)}
                  placeholder="List the key responsibilities for this role..."
                  disabled={loading}
                  minHeight={150}
                />
              </div>
            </div>

            {/* Location */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-6">Location</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Province *</label>
                  <select
                    value={formData.province}
                    onChange={(e) => handleChange('province', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                    required
                    disabled={loading}
                  >
                    <option value="">Select Province</option>
                    {PROVINCES.map((province) => (
                      <option key={province.value} value={province.value}>
                        {province.label}
                      </option>
                    ))}
                  </select>
                </div>

                <Input
                  label="District *"
                  type="text"
                  value={formData.district}
                  onChange={(e) => handleChange('district', e.target.value)}
                  placeholder="Enter district"
                  required
                  disabled={loading}
                />

                <Input
                  label="City *"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Enter city"
                  required
                  disabled={loading}
                />

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isRemote"
                    checked={formData.isRemote}
                    onChange={(e) => handleChange('isRemote', e.target.checked)}
                    className="w-5 h-5 rounded border-2"
                    style={{
                      backgroundColor: formData.isRemote ? 'oklch(0.7 0.15 180)' : 'oklch(0.1 0 0 / 0.8)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                    disabled={loading}
                  />
                  <label htmlFor="isRemote" className="text-sm text-gray-300 cursor-pointer">
                    Remote work available
                  </label>
                </div>
              </div>
            </div>

            {/* Compensation */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-6">Compensation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Minimum Salary (Rs.)"
                  type="number"
                  value={formData.salaryMin}
                  onChange={(e) => handleChange('salaryMin', e.target.value)}
                  placeholder="e.g., 50000"
                  disabled={loading}
                />

                <Input
                  label="Maximum Salary (Rs.)"
                  type="number"
                  value={formData.salaryMax}
                  onChange={(e) => handleChange('salaryMax', e.target.value)}
                  placeholder="e.g., 100000"
                  disabled={loading}
                />

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Salary Type</label>
                  <select
                    value={formData.salaryType}
                    onChange={(e) => handleChange('salaryType', e.target.value)}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                    disabled={loading}
                  >
                    {SALARY_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Required Skills */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-6">Required Skills *</h2>
              <p className="text-gray-400 text-sm mb-4">
                Add at least one skill required for this position. Proficiency level indicates how important this skill is (1 = Basic, 5 = Expert).
              </p>
              
              {/* Add Skill Input */}
              <div className="flex gap-3 mb-4">
                <Input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  placeholder="e.g., JavaScript, Python, React..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                  disabled={loading}
                  className="flex-1"
                />
                <select
                  value={newSkillProficiency}
                  onChange={(e) => setNewSkillProficiency(e.target.value)}
                  className="px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                  style={{
                    backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    width: '120px',
                  }}
                  disabled={loading}
                >
                  <option value="1">Level 1</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4</option>
                  <option value="5">Level 5</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addSkill}
                  disabled={loading}
                >
                  Add Skill
                </Button>
              </div>

              {/* Skills List */}
              {skills.length > 0 && (
                <div className="space-y-2 mb-4">
                  {skills.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-lg border-2"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.5)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                    >
                      <span className="flex-1 text-white font-medium">{skill.name}</span>
                      <select
                        value={skill.proficiency}
                        onChange={(e) => updateSkillProficiency(index, parseInt(e.target.value))}
                        className="px-3 py-1.5 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          width: '100px',
                        }}
                        disabled={loading}
                      >
                        <option value="1">Level 1</option>
                        <option value="2">Level 2</option>
                        <option value="3">Level 3</option>
                        <option value="4">Level 4</option>
                        <option value="5">Level 5</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeSkill(index)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        disabled={loading}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {skills.length === 0 && (
                <p className="text-yellow-400 text-sm">⚠️ At least one skill is required</p>
              )}
            </div>

            {/* Additional Details */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-6">Additional Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Experience Required (Years)"
                  type="number"
                  value={formData.experienceYears}
                  onChange={(e) => handleChange('experienceYears', e.target.value)}
                  placeholder="e.g., 3"
                  disabled={loading}
                />

                <Input
                  label="Education Level"
                  type="text"
                  value={formData.educationLevel}
                  onChange={(e) => handleChange('educationLevel', e.target.value)}
                  placeholder="e.g., Bachelor's Degree"
                  disabled={loading}
                />

                <Input
                  label="Contract Duration (Months)"
                  type="number"
                  value={formData.contractDuration}
                  onChange={(e) => handleChange('contractDuration', e.target.value)}
                  placeholder="e.g., 12"
                  disabled={loading}
                />

                <Input
                  label="Total Positions"
                  type="number"
                  value={formData.totalPositions}
                  onChange={(e) => handleChange('totalPositions', e.target.value)}
                  placeholder="e.g., 1"
                  required
                  disabled={loading}
                />

                <div className="md:col-span-2">
                  <Input
                    label="Expires At (Optional)"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) => handleChange('expiresAt', e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    disabled={loading}
                    helperText="Must be a future date. Leave empty if the job doesn't expire."
                  />
                </div>
              </div>

              {/* Job Status */}
              <div className="col-span-full">
                <div className="flex items-center justify-between p-4 rounded-xl border-2" style={{ backgroundColor: 'oklch(0.1 0 0 / 0.6)', borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Job Status
                    </label>
                    <p className="text-xs text-gray-400">
                      {formData.isActive 
                        ? 'Job will be active and visible to job seekers' 
                        : 'Job will be inactive and hidden from job seekers'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => handleChange('isActive', e.target.checked)}
                      className="sr-only peer"
                      disabled={loading}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
                    <span className="ml-3 text-sm font-medium text-white">
                      {formData.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-6">
              <Link href="/dashboard/employer/jobs">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Posting...' : 'Post Job'}
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function PostJobPage() {
  return (
    <ProtectedRoute>
      <PostJobContent />
    </ProtectedRoute>
  );
}

