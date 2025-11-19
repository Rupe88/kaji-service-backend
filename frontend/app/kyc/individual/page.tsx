'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { kycApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Individual KYC Schema (simplified - matching backend requirements)
const individualKYCSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(200),
  gender: z.enum(['Male', 'Female', 'Other', 'Prefer not to say']),
  pronouns: z.string().max(50).optional(),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  nationalId: z.string().min(1, 'National ID is required').max(50),
  passportNumber: z.string().max(50).optional(),
  country: z.string().min(1, 'Country is required'),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  municipality: z.string().min(1, 'Municipality is required'),
  ward: z.string().min(1, 'Ward is required'),
  street: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  emergencyContact: z.string().min(1, 'Emergency contact is required'),
  highestQualification: z.string().min(1, 'Highest qualification is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  schoolUniversity: z.string().max(200).optional(),
  languagesKnown: z.array(z.string()).min(1, 'At least one language is required'),
  employmentStatus: z.enum([
    'INTERNSHIP',
    'PART_TIME',
    'HOURLY_PAY',
    'PROBATION',
    'FULLY_EMPLOYED',
    'LOOKING_CHANGE',
    'LOOKING_NEW',
    'PARTNERSHIP_SEEKING',
    'PARTNERSHIP_AND_JOB',
  ]),
  expectedSalaryMin: z.number().int().min(0).max(10000000).optional(),
  expectedSalaryMax: z.number().int().min(0).max(10000000).optional(),
  willingRelocate: z.boolean(),
  consentGiven: z.boolean().refine((val) => val === true, {
    message: 'You must give consent to proceed',
  }),
}).refine(
  (data) => {
    if (data.expectedSalaryMin !== undefined && data.expectedSalaryMax !== undefined && data.expectedSalaryMax < data.expectedSalaryMin) {
      return false;
    }
    return true;
  },
  {
    message: 'Maximum salary must be greater than or equal to minimum salary',
    path: ['expectedSalaryMax'],
  }
);

type IndividualKYCFormData = z.infer<typeof individualKYCSchema>;

function IndividualKYCContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [existingKYC, setExistingKYC] = useState<any>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<IndividualKYCFormData>({
    resolver: zodResolver(individualKYCSchema),
    defaultValues: {
      country: 'Nepal',
      willingRelocate: false,
      consentGiven: false,
      languagesKnown: [],
      pronouns: '',
      passportNumber: '',
      street: '',
      city: '',
      schoolUniversity: '',
    },
  });

  useEffect(() => {
    const fetchExistingKYC = async () => {
      if (!user?.id) return;
      try {
        const kycData = await kycApi.getKYC(user.id, 'INDIVIDUAL');
        if (kycData) {
          setExistingKYC(kycData);
          // Pre-fill form with existing data
          Object.keys(kycData).forEach((key) => {
            if (key !== 'userId' && key !== 'id' && key !== 'status' && key !== 'createdAt' && key !== 'updatedAt') {
              setValue(key as any, kycData[key]);
            }
          });
        }
      } catch (error) {
        console.error('Error fetching existing KYC:', error);
      }
    };
    fetchExistingKYC();
  }, [user?.id, setValue]);

  const onSubmit = async (data: IndividualKYCFormData) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add userId (required by backend)
      formData.append('userId', user.id);
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'dateOfBirth') {
          // Skip, will be handled separately below
          return;
        }
        if (key === 'languagesKnown' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else if (key === 'consentGiven' || key === 'willingRelocate') {
          formData.append(key, value.toString());
        } else if (key === 'expectedSalaryMin' || key === 'expectedSalaryMax') {
          if (value !== undefined && value !== null) {
            formData.append(key, value.toString());
          }
        } else if (value !== undefined && value !== null && value !== '') {
          formData.append(key, value.toString());
        }
      });

      // Add profile photo if selected (backend expects 'file' field for uploadSingle middleware)
      if (profilePhoto) {
        formData.append('file', profilePhoto);
      }

      // Convert dateOfBirth to ISO string (backend expects datetime format)
      if (data.dateOfBirth) {
        // If it's already in ISO format, use it; otherwise convert
        let dateStr = data.dateOfBirth;
        if (!dateStr.includes('T')) {
          // It's a date input (YYYY-MM-DD), convert to ISO datetime
          const date = new Date(dateStr + 'T00:00:00');
          dateStr = date.toISOString();
        }
        formData.append('dateOfBirth', dateStr);
      }

      if (existingKYC) {
        await kycApi.updateIndividual(user.id, formData);
        toast.success('KYC updated successfully!');
      } else {
        await kycApi.createIndividual(formData);
        toast.success('KYC submitted successfully! Your application is under review.');
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      console.error('KYC submission error:', error);
      toast.error(error.response?.data?.message || 'Failed to submit KYC. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const languagesKnown = watch('languagesKnown') || [];
  const addLanguage = (lang: string) => {
    if (lang && !languagesKnown.includes(lang)) {
      setValue('languagesKnown', [...languagesKnown, lang]);
    }
  };
  const removeLanguage = (lang: string) => {
    setValue('languagesKnown', languagesKnown.filter((l) => l !== lang));
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
              <h1 className="text-4xl font-bold text-white mb-2">Individual KYC Verification</h1>
              <p className="text-gray-400">Complete your KYC to unlock all features and apply for jobs</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      step <= currentStep
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'border-gray-600 text-gray-400'
                    }`}>
                      {step < currentStep ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <span>{step}</span>
                      )}
                    </div>
                    {step < totalSteps && (
                      <div className={`flex-1 h-1 mx-2 ${step < currentStep ? 'bg-teal-500' : 'bg-gray-600'}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="text-sm text-gray-400 text-center">
                Step {currentStep} of {totalSteps}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl border-2 backdrop-blur-xl p-6 sm:p-8"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                {/* Step 1: Personal Information */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Personal Information</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Full Name *"
                        {...register('fullName')}
                        error={errors.fullName?.message}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Gender *</label>
                        <select
                          {...register('gender')}
                          className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: errors.gender ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          <option value="Prefer not to say">Prefer not to say</option>
                        </select>
                        {errors.gender && <p className="text-red-400 text-sm mt-1">{errors.gender.message}</p>}
                      </div>
                      <Input
                        label="Pronouns"
                        {...register('pronouns')}
                        error={errors.pronouns?.message}
                      />
                      <Input
                        label="Date of Birth *"
                        type="date"
                        {...register('dateOfBirth')}
                        error={errors.dateOfBirth?.message}
                      />
                      <Input
                        label="National ID *"
                        {...register('nationalId')}
                        error={errors.nationalId?.message}
                      />
                      <Input
                        label="Passport Number"
                        {...register('passportNumber')}
                        error={errors.passportNumber?.message}
                      />
                      <Input
                        label="Email *"
                        type="email"
                        {...register('email')}
                        error={errors.email?.message}
                        defaultValue={user?.email}
                      />
                      <Input
                        label="Phone *"
                        type="tel"
                        {...register('phone')}
                        error={errors.phone?.message}
                        defaultValue={user?.phone}
                      />
                      <Input
                        label="Emergency Contact *"
                        type="tel"
                        {...register('emergencyContact')}
                        error={errors.emergencyContact?.message}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Profile Photo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProfilePhoto(e.target.files?.[0] || null)}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                          borderWidth: '2px',
                          borderStyle: 'solid',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Address Information */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Address Information</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Country *"
                        {...register('country')}
                        error={errors.country?.message}
                        defaultValue="Nepal"
                      />
                      <Input
                        label="Province *"
                        {...register('province')}
                        error={errors.province?.message}
                      />
                      <Input
                        label="District *"
                        {...register('district')}
                        error={errors.district?.message}
                      />
                      <Input
                        label="Municipality *"
                        {...register('municipality')}
                        error={errors.municipality?.message}
                      />
                      <Input
                        label="Ward *"
                        {...register('ward')}
                        error={errors.ward?.message}
                      />
                      <Input
                        label="Street"
                        {...register('street')}
                        error={errors.street?.message}
                      />
                      <Input
                        label="City"
                        {...register('city')}
                        error={errors.city?.message}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Education & Employment */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Education & Employment</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Highest Qualification *"
                        {...register('highestQualification')}
                        error={errors.highestQualification?.message}
                        placeholder="e.g., Bachelor's Degree, Master's Degree"
                      />
                      <Input
                        label="Field of Study *"
                        {...register('fieldOfStudy')}
                        error={errors.fieldOfStudy?.message}
                        placeholder="e.g., Computer Science, Business"
                      />
                      <Input
                        label="School/University"
                        {...register('schoolUniversity')}
                        error={errors.schoolUniversity?.message}
                        className="md:col-span-2"
                      />
                      
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Languages Known *</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {languagesKnown.map((lang) => (
                            <span
                              key={lang}
                              className="px-3 py-1 bg-teal-500/20 text-teal-400 rounded-full text-sm flex items-center gap-2"
                            >
                              {lang}
                              <button
                                type="button"
                                onClick={() => removeLanguage(lang)}
                                className="hover:text-red-400"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Add language (e.g., English, Nepali)"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addLanguage(e.currentTarget.value);
                                e.currentTarget.value = '';
                              }
                            }}
                            className="flex-1 px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                            style={{
                              backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                              borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const input = document.querySelector('input[placeholder*="Add language"]') as HTMLInputElement;
                              if (input?.value) {
                                addLanguage(input.value);
                                input.value = '';
                              }
                            }}
                          >
                            Add
                          </Button>
                        </div>
                        {errors.languagesKnown && (
                          <p className="text-red-400 text-sm mt-1">{errors.languagesKnown.message}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300 mb-2">Employment Status *</label>
                        <select
                          {...register('employmentStatus')}
                          className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: errors.employmentStatus ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          <option value="">Select Employment Status</option>
                          <option value="INTERNSHIP">Internship</option>
                          <option value="PART_TIME">Part Time</option>
                          <option value="HOURLY_PAY">Hourly Pay</option>
                          <option value="PROBATION">Probation</option>
                          <option value="FULLY_EMPLOYED">Fully Employed</option>
                          <option value="LOOKING_CHANGE">Looking for Change</option>
                          <option value="LOOKING_NEW">Looking for New Job</option>
                          <option value="PARTNERSHIP_SEEKING">Partnership Seeking</option>
                          <option value="PARTNERSHIP_AND_JOB">Partnership and Job</option>
                        </select>
                        {errors.employmentStatus && (
                          <p className="text-red-400 text-sm mt-1">{errors.employmentStatus.message}</p>
                        )}
                      </div>

                      <Input
                        label="Expected Salary Min (NPR)"
                        type="number"
                        {...register('expectedSalaryMin', { valueAsNumber: true })}
                        error={errors.expectedSalaryMin?.message}
                      />
                      <Input
                        label="Expected Salary Max (NPR)"
                        type="number"
                        {...register('expectedSalaryMax', { valueAsNumber: true })}
                        error={errors.expectedSalaryMax?.message}
                      />

                      <div className="md:col-span-2 flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="willingRelocate"
                          {...register('willingRelocate')}
                          className="w-5 h-5 rounded border-gray-600 bg-gray-800 text-teal-500 focus:ring-teal-500"
                        />
                        <label htmlFor="willingRelocate" className="text-gray-300">
                          Willing to relocate
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Consent */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold text-white mb-6">Consent & Submission</h2>
                    
                    <div className="space-y-4">
                      <div className="p-4 rounded-xl" style={{ backgroundColor: 'oklch(0.15 0 0 / 0.5)' }}>
                        <h3 className="text-white font-semibold mb-2">Terms & Conditions</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          By submitting this KYC form, you agree to:
                        </p>
                        <ul className="text-gray-400 text-sm space-y-2 list-disc list-inside">
                          <li>Provide accurate and truthful information</li>
                          <li>Allow us to verify your identity and credentials</li>
                          <li>Use your information for job matching and platform services</li>
                          <li>Comply with all platform policies and guidelines</li>
                        </ul>
                      </div>

                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="consentGiven"
                          {...register('consentGiven')}
                          className="w-5 h-5 mt-1 rounded border-gray-600 bg-gray-800 text-teal-500 focus:ring-teal-500"
                        />
                        <label htmlFor="consentGiven" className="text-gray-300">
                          I agree to the terms and conditions and consent to the processing of my personal data for KYC verification and platform services. *
                        </label>
                      </div>
                      {errors.consentGiven && (
                        <p className="text-red-400 text-sm">{errors.consentGiven.message}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-800/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                    disabled={currentStep === 1}
                  >
                    Previous
                  </Button>
                  
                  {currentStep < totalSteps ? (
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setCurrentStep(Math.min(totalSteps, currentStep + 1))}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={loading}
                    >
                      {existingKYC ? 'Update KYC' : 'Submit KYC'}
                    </Button>
                  )}
                </div>
              </motion.div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function IndividualKYCPage() {
  return <IndividualKYCContent />;
}
