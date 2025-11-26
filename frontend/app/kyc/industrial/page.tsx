'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { kycApi } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getProvinces, getDistrictsByProvince, getMunicipalitiesByDistrict } from '@/lib/nepal-locations';

// Industrial KYC Schema (matching backend requirements exactly)
const industrialKYCSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must be less than 200 characters'),
  companyEmail: z.string().email('Invalid email address').toLowerCase().trim(),
  companyPhone: z.string().min(1, 'Company phone is required').regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,15}$|^[0-9]{10,15}$/, 'Invalid phone number format. Use format: +1234567890, (123) 456-7890, or 1234567890'),
  registrationNumber: z.string().max(100, 'Registration number must be less than 100 characters').optional(),
  yearsInBusiness: z.number().int().min(0, 'Years in business cannot be negative').max(200, 'Invalid years in business').optional(),
  companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
  industrySector: z.string().max(200, 'Industry sector must be less than 200 characters').optional(),
  country: z.string().min(1, 'Country is required').max(100, 'Country must be less than 100 characters').default('Nepal'),
  province: z.string().min(1, 'Province is required').max(100, 'Province must be less than 100 characters'),
  district: z.string().min(1, 'District is required').max(100, 'District must be less than 100 characters'),
  municipality: z.string().min(1, 'Municipality is required').max(100, 'Municipality must be less than 100 characters'),
  ward: z.string().min(1, 'Ward is required').max(10, 'Ward must be less than 10 characters'),
  street: z.string().max(200, 'Street must be less than 200 characters').optional(),
  contactPersonName: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters').regex(/^[a-zA-Z0-9\s'.-]+$/, 'Name can only contain letters, numbers, spaces, hyphens, apostrophes, and periods'),
  contactPersonDesignation: z.string().max(100, 'Designation must be less than 100 characters').optional(),
  contactPersonPhone: z.string().min(1, 'Phone number is required').regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,15}$|^[0-9]{10,15}$/, 'Invalid phone number format. Use format: +1234567890, (123) 456-7890, or 1234567890'),
});

type IndustrialKYCFormData = z.infer<typeof industrialKYCSchema>;

function IndustrialKYCContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [existingKYC, setExistingKYC] = useState<any>(null);

  // Redirect INDIVIDUAL users to Individual KYC page (only if they have a role set)
  useEffect(() => {
    if (user?.role === 'INDIVIDUAL') {
      router.replace('/kyc/individual');
    }
  }, [user?.role, router]);
  const [documents, setDocuments] = useState<{
    registrationCertificate?: File;
    taxClearanceCertificate?: File;
    panCertificate?: File;
    vatCertificate?: File;
  }>({});

  // Location state for cascading dropdowns
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    setError,
    clearErrors,
  } = useForm<IndustrialKYCFormData>({
    resolver: zodResolver(industrialKYCSchema),
    defaultValues: {
      country: 'Nepal',
      province: '',
      district: '',
      municipality: '',
    },
  });

  useEffect(() => {
    const fetchExistingKYC = async () => {
      if (!user?.id) return;
      try {
        const kycData = await kycApi.getKYC(user.id, 'INDUSTRIAL');
        if (kycData) {
          setExistingKYC(kycData);
          // Pre-fill form with existing data
          Object.keys(kycData).forEach((key) => {
            if (key !== 'userId' && key !== 'id' && key !== 'status' && key !== 'createdAt' && key !== 'updatedAt' && !key.includes('Certificate')) {
              setValue(key as any, kycData[key]);
            }
          });
          // Set location state for cascading dropdowns
          if (kycData.province) {
            setSelectedProvince(kycData.province);
          }
          if (kycData.district) {
            setSelectedDistrict(kycData.district);
          }
        }
      } catch (error) {
        console.error('Error fetching existing KYC:', error);
      }
    };
    fetchExistingKYC();
  }, [user?.id, setValue]);

  // Handle province change
  const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const province = e.target.value;
    setSelectedProvince(province);
    setSelectedDistrict(''); // Reset district
    setValue('province', province);
    setValue('district', ''); // Clear district
    setValue('municipality', ''); // Clear municipality
  };

  // Handle district change
  const handleDistrictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const district = e.target.value;
    setSelectedDistrict(district);
    setValue('district', district);
    setValue('municipality', ''); // Clear municipality
  };

  // Handle municipality change
  const handleMunicipalityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const municipality = e.target.value;
    setValue('municipality', municipality);
  };

  const handleDocumentChange = (field: string, file: File | null) => {
    setDocuments((prev) => ({
      ...prev,
      [field]: file || undefined,
    }));
  };

  const onSubmit = async (data: IndustrialKYCFormData) => {
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
        if (value !== undefined && value !== null && value !== '') {
          // For number fields, ensure they're properly converted
          if (key === 'yearsInBusiness') {
            if (typeof value === 'number' && !isNaN(value)) {
              formData.append(key, value.toString());
            }
            // Skip if it's not a valid number (optional field)
          } else if (typeof value === 'number') {
            formData.append(key, value.toString());
          } else {
            formData.append(key, value.toString());
          }
        }
      });

      // Add document files
      if (documents.registrationCertificate) {
        formData.append('registrationCertificate', documents.registrationCertificate);
      }
      if (documents.taxClearanceCertificate) {
        formData.append('taxClearanceCertificate', documents.taxClearanceCertificate);
      }
      if (documents.panCertificate) {
        formData.append('panCertificate', documents.panCertificate);
      }
      if (documents.vatCertificate) {
        formData.append('vatCertificate', documents.vatCertificate);
      }

      if (existingKYC) {
        await kycApi.updateIndustrial(user.id, formData);
        toast.success('KYC updated successfully!');
      } else {
        await kycApi.createIndustrial(formData);
        toast.success('KYC submitted successfully! Your application is under review.');
      }
      
      // Redirect to appropriate dashboard based on role
      const { authApi } = await import('@/lib/auth');
      const { getDashboardRoute } = await import('@/lib/routing');
      try {
        const userData = await authApi.getMe();
        router.push(getDashboardRoute(userData.role));
      } catch {
        router.push('/dashboard');
      }
    } catch (error: any) {
      console.error('KYC submission error:', error);
      
      // Handle validation errors from backend
      if (error.response?.data?.errors && Array.isArray(error.response.data.errors)) {
        const validationErrors = error.response.data.errors;
        
        // Clear all previous errors
        clearErrors();
        
        // Set errors for each field
        validationErrors.forEach((err: any) => {
          const fieldName = err.path as keyof IndustrialKYCFormData;
          if (fieldName) {
            setError(fieldName, {
              type: 'server',
              message: err.message || 'Invalid value',
            });
          }
        });
        
        // Show toast with first error
        const firstError = validationErrors[0];
        toast.error(firstError?.message || 'Please fix the validation errors', { duration: 5000 });
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message, { duration: 5000 });
      } else {
        toast.error('Failed to submit KYC. Please check all required fields and try again.', { duration: 5000 });
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't render if user is INDIVIDUAL (will be redirected)
  if (user?.role === 'INDIVIDUAL') {
    return null;
  }

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
              <h1 className="text-4xl font-bold text-white mb-2">Industrial KYC Verification</h1>
              <p className="text-gray-400">Complete your company KYC to post jobs and access all features</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border-2 backdrop-blur-xl p-6 sm:p-8"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
              >
                <div className="space-y-6">
                  {/* Company Information */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Company Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Company Name *"
                        {...register('companyName')}
                        error={errors.companyName?.message}
                      />
                      <Input
                        label="Company Email *"
                        type="email"
                        {...register('companyEmail')}
                        error={errors.companyEmail?.message}
                      />
                      <Input
                        label="Company Phone *"
                        type="tel"
                        {...register('companyPhone')}
                        error={errors.companyPhone?.message}
                      />
                      <Input
                        label="Registration Number"
                        {...register('registrationNumber')}
                        error={errors.registrationNumber?.message}
                      />
                      <Input
                        label="Years in Business"
                        type="number"
                        {...register('yearsInBusiness', { valueAsNumber: true })}
                        error={errors.yearsInBusiness?.message}
                      />
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Company Size</label>
                        <select
                          {...register('companySize')}
                          className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: errors.companySize ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
                          }}
                        >
                          <option value="">Select Company Size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="501-1000">501-1000 employees</option>
                          <option value="1000+">1000+ employees</option>
                        </select>
                        {errors.companySize && (
                          <p className="text-red-400 text-sm mt-1">{errors.companySize.message}</p>
                        )}
                      </div>
                      <Input
                        label="Industry Sector"
                        {...register('industrySector')}
                        error={errors.industrySector?.message}
                        className="md:col-span-2"
                        placeholder="e.g., Technology, Manufacturing, Services"
                      />
                    </div>
                  </div>

                  {/* Address Information */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Company Address</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Country *"
                        {...register('country')}
                        error={errors.country?.message}
                        defaultValue="Nepal"
                        readOnly
                      />
                      <Select
                        label="Province *"
                        {...register('province')}
                        error={errors.province?.message}
                        options={getProvinces()}
                        placeholder="Select Province"
                        value={watch('province') || selectedProvince}
                        onChange={handleProvinceChange}
                      />
                      <Select
                        label="District *"
                        {...register('district')}
                        error={errors.district?.message}
                        options={selectedProvince ? getDistrictsByProvince(selectedProvince) : []}
                        placeholder={selectedProvince ? "Select District" : "Select Province first"}
                        value={watch('district') || selectedDistrict}
                        onChange={handleDistrictChange}
                        disabled={!selectedProvince}
                      />
                      <Select
                        label="Municipality *"
                        {...register('municipality')}
                        error={errors.municipality?.message}
                        options={selectedProvince && selectedDistrict ? getMunicipalitiesByDistrict(selectedProvince, selectedDistrict) : []}
                        placeholder={selectedDistrict ? "Select Municipality" : "Select District first"}
                        value={watch('municipality')}
                        onChange={handleMunicipalityChange}
                        disabled={!selectedDistrict}
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
                    </div>
                  </div>

                  {/* Contact Person */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Contact Person</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="Contact Person Name *"
                        {...register('contactPersonName')}
                        error={errors.contactPersonName?.message}
                      />
                      <Input
                        label="Designation"
                        {...register('contactPersonDesignation')}
                        error={errors.contactPersonDesignation?.message}
                      />
                      <Input
                        label="Contact Person Phone *"
                        type="tel"
                        {...register('contactPersonPhone')}
                        error={errors.contactPersonPhone?.message}
                        className="md:col-span-2"
                      />
                    </div>
                  </div>

                  {/* Documents */}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-6">Required Documents</h2>
                    <p className="text-gray-400 text-sm mb-4">
                      Upload the following documents (PDF, JPG, or PNG format, max 5MB each)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Registration Certificate
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentChange('registrationCertificate', e.target.files?.[0] || null)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                            borderWidth: '2px',
                            borderStyle: 'solid',
                          }}
                        />
                        {documents.registrationCertificate && (
                          <p className="text-teal-400 text-xs mt-1">✓ {documents.registrationCertificate.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Tax Clearance Certificate
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentChange('taxClearanceCertificate', e.target.files?.[0] || null)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                            borderWidth: '2px',
                            borderStyle: 'solid',
                          }}
                        />
                        {documents.taxClearanceCertificate && (
                          <p className="text-teal-400 text-xs mt-1">✓ {documents.taxClearanceCertificate.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          PAN Certificate
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentChange('panCertificate', e.target.files?.[0] || null)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                            borderWidth: '2px',
                            borderStyle: 'solid',
                          }}
                        />
                        {documents.panCertificate && (
                          <p className="text-teal-400 text-xs mt-1">✓ {documents.panCertificate.name}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          VAT Certificate (Optional)
                        </label>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => handleDocumentChange('vatCertificate', e.target.files?.[0] || null)}
                          className="w-full px-4 py-3 rounded-xl text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
                          style={{
                            backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                            borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                            borderWidth: '2px',
                            borderStyle: 'solid',
                          }}
                        />
                        {documents.vatCertificate && (
                          <p className="text-teal-400 text-xs mt-1">✓ {documents.vatCertificate.name}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex items-center justify-end pt-6 border-t border-gray-800/50">
                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      isLoading={loading}
                    >
                      {existingKYC ? 'Update KYC' : 'Submit KYC'}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </form>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  );
}

export default function IndustrialKYCPage() {
  return (
    <ProtectedRoute requiredRole="INDUSTRIAL">
      <IndustrialKYCContent />
    </ProtectedRoute>
  );
}
