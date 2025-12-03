'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { urgentJobsApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LocationPicker } from '@/components/urgent-jobs/LocationPicker';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const CATEGORIES = [
  { value: 'HAND_TO_HAND', label: 'Hand to Hand' },
  { value: 'CASH_TO_CASH', label: 'Cash to Cash' },
  { value: 'LABOR', label: 'Labor Work' },
  { value: 'OTHER', label: 'Other' },
];

const URGENCY_LEVELS = [
  { value: 'IMMEDIATE', label: 'Immediate (Right Now)' },
  { value: 'TODAY', label: 'Today' },
  { value: 'WITHIN_HOURS', label: 'Within Hours' },
];

const PAYMENT_TYPES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'DIGITAL', label: 'Digital Payment' },
  { value: 'BOTH', label: 'Both' },
];

const urgentJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.enum(['HAND_TO_HAND', 'CASH_TO_CASH', 'LABOR', 'OTHER']),
  paymentAmount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1000000;
  }, 'Payment amount must be between 1 and 1,000,000'),
  paymentType: z.enum(['CASH', 'DIGITAL', 'BOTH']),
  urgencyLevel: z.enum(['IMMEDIATE', 'TODAY', 'WITHIN_HOURS']),
  maxWorkers: z.string().refine((val) => {
    const num = parseInt(val);
    return !isNaN(num) && num >= 1 && num <= 100;
  }, 'Number of workers must be between 1 and 100'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().optional(),
  expiresAt: z.string().optional(),
  contactPhone: z.string().min(1, 'Contact phone is required').regex(/^[0-9+\-\s()]+$/, 'Invalid phone number'),
  contactMethod: z.string().optional(),
  province: z.string().min(1, 'Province is required'),
  district: z.string().min(1, 'District is required'),
  city: z.string().min(1, 'City is required'),
  ward: z.string().optional(),
  street: z.string().optional(),
});

type UrgentJobFormData = z.infer<typeof urgentJobSchema>;

function PostUrgentJobContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [location, setLocation] = useState<{
    province: string;
    district: string;
    city: string;
    ward?: string;
    street?: string;
    latitude?: number;
    longitude?: number;
  }>({
    province: '',
    district: '',
    city: '',
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    trigger,
  } = useForm<UrgentJobFormData>({
    resolver: zodResolver(urgentJobSchema),
    defaultValues: {
      category: 'LABOR',
      paymentType: 'CASH',
      urgencyLevel: 'TODAY',
      maxWorkers: '1',
      contactMethod: '',
    },
  });

  // Update form when location changes
  React.useEffect(() => {
    setValue('province', location.province);
    setValue('district', location.district);
    setValue('city', location.city);
    setValue('ward', location.ward || '');
    setValue('street', location.street || '');
    trigger(['province', 'district', 'city']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: UrgentJobFormData) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      
      // Add all form fields
      formData.append('posterId', user.id);
      formData.append('title', data.title);
      formData.append('description', data.description);
      formData.append('category', data.category);
      formData.append('paymentAmount', data.paymentAmount);
      formData.append('paymentType', data.paymentType);
      formData.append('urgencyLevel', data.urgencyLevel);
      formData.append('maxWorkers', data.maxWorkers);
      formData.append('contactPhone', data.contactPhone);
      
      if (data.contactMethod) {
        formData.append('contactMethod', data.contactMethod);
      }

      // Location
      formData.append('province', location.province);
      formData.append('district', location.district);
      formData.append('city', location.city);
      if (location.ward) formData.append('ward', location.ward);
      if (location.street) formData.append('street', location.street);
      if (location.latitude) formData.append('latitude', location.latitude.toString());
      if (location.longitude) formData.append('longitude', location.longitude.toString());

      // Time fields - convert to ISO datetime format
      // datetime-local returns format: YYYY-MM-DDTHH:mm
      // We need to ensure it's in ISO format
      if (!data.startTime) {
        toast.error('Start time is required');
        setLoading(false);
        return;
      }

      try {
        const startTime = new Date(data.startTime);
        if (isNaN(startTime.getTime())) {
          throw new Error('Invalid start time');
        }
        formData.append('startTime', startTime.toISOString());
      } catch (error: any) {
        toast.error('Invalid start time format: ' + (error.message || 'Please select a valid start time'));
        setLoading(false);
        return;
      }
      
      if (data.endTime) {
        try {
          const endTime = new Date(data.endTime);
          if (isNaN(endTime.getTime())) {
            throw new Error('Invalid end time');
          }
          // Ensure end time is after start time
          const startTime = new Date(data.startTime);
          if (endTime <= startTime) {
            toast.error('End time must be after start time');
            setLoading(false);
            return;
          }
          formData.append('endTime', endTime.toISOString());
        } catch (error: any) {
          toast.error('Invalid end time format: ' + (error.message || 'Please select a valid end time'));
          setLoading(false);
          return;
        }
      }

      if (data.expiresAt) {
        try {
          const expiresAt = new Date(data.expiresAt);
          if (isNaN(expiresAt.getTime())) {
            throw new Error('Invalid expiration time');
          }
          // Ensure expiration is after start time
          const startTime = new Date(data.startTime);
          if (expiresAt <= startTime) {
            toast.error('Expiration time must be after start time');
            setLoading(false);
            return;
          }
          formData.append('expiresAt', expiresAt.toISOString());
        } catch (error: any) {
          toast.error('Invalid expiration time format: ' + (error.message || 'Please select a valid expiration time'));
          setLoading(false);
          return;
        }
      }

      // Image
      if (selectedImage) {
        formData.append('image', selectedImage);
      }

      console.log('Submitting urgent job with FormData:', {
        title: data.title,
        category: data.category,
        location: location,
        hasImage: !!selectedImage,
      });

      const response = await urgentJobsApi.create(formData);
      
      console.log('Urgent job created successfully:', response);
      
      if (response && response.id) {
        toast.success('Urgent job posted successfully!');
        router.push(`/dashboard/urgent-jobs/${response.id}`);
      } else if (response && response.data && response.data.id) {
        toast.success('Urgent job posted successfully!');
        router.push(`/dashboard/urgent-jobs/${response.data.id}`);
      } else {
        toast.error('Unexpected response format from server');
        console.error('Unexpected response:', response);
      }
    } catch (error: any) {
      console.error('Error posting urgent job:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to post urgent job. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Link href="/dashboard/urgent-jobs" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Urgent Jobs
              </Link>
              <h1 className="text-4xl font-bold text-white mb-2">Post Urgent Job</h1>
              <p className="text-gray-400">Create a job posting for immediate work needs</p>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleSubmit(onSubmit)(e);
              }}
            >
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
                  {/* Title */}
                  <Input
                    label="Job Title *"
                    {...register('title')}
                    error={errors.title?.message}
                    placeholder="e.g., Need help moving furniture"
                  />

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Description *</label>
                    <textarea
                      {...register('description')}
                      rows={5}
                      className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2 resize-none"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: errors.description ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                      placeholder="Describe the work needed in detail..."
                    />
                    {errors.description && (
                      <p className="text-sm mt-1" style={{ color: 'oklch(0.65 0.2 330)' }}>
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* Category and Urgency */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Category *</label>
                      <select
                        {...register('category')}
                        className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: errors.category ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                      </select>
                      {errors.category && (
                        <p className="text-sm mt-1" style={{ color: 'oklch(0.65 0.2 330)' }}>
                          {errors.category.message}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Urgency Level *</label>
                      <select
                        {...register('urgencyLevel')}
                        className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: errors.urgencyLevel ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {URGENCY_LEVELS.map(level => (
                          <option key={level.value} value={level.value}>{level.label}</option>
                        ))}
                      </select>
                      {errors.urgencyLevel && (
                        <p className="text-sm mt-1" style={{ color: 'oklch(0.65 0.2 330)' }}>
                          {errors.urgencyLevel.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Payment Amount (NPR) *</label>
                      <Input
                        type="number"
                        {...register('paymentAmount')}
                        error={errors.paymentAmount?.message}
                        placeholder="e.g., 5000"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Payment Type *</label>
                      <select
                        {...register('paymentType')}
                        className="w-full px-4 py-3 rounded-xl text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:ring-2 transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: errors.paymentType ? 'oklch(0.65 0.2 330)' : 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        {PAYMENT_TYPES.map(type => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      {errors.paymentType && (
                        <p className="text-sm mt-1" style={{ color: 'oklch(0.65 0.2 330)' }}>
                          {errors.paymentType.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Workers and Contact */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Number of Workers Needed *"
                      type="number"
                      {...register('maxWorkers')}
                      error={errors.maxWorkers?.message}
                      placeholder="e.g., 2"
                    />

                    <Input
                      label="Contact Phone *"
                      type="tel"
                      {...register('contactPhone')}
                      error={errors.contactPhone?.message}
                      placeholder="e.g., 9816366094"
                    />
                  </div>

                  <Input
                    label="Contact Method (Optional)"
                    {...register('contactMethod')}
                    error={errors.contactMethod?.message}
                    placeholder="e.g., Call, WhatsApp, SMS"
                  />

                  {/* Location */}
                  <LocationPicker
                    onLocationChange={setLocation}
                    error={errors.province?.message || errors.district?.message || errors.city?.message}
                  />

                  {/* Time Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Input
                      label="Start Time *"
                      type="datetime-local"
                      {...register('startTime')}
                      error={errors.startTime?.message}
                    />

                    <Input
                      label="End Time (Optional)"
                      type="datetime-local"
                      {...register('endTime')}
                      error={errors.endTime?.message}
                    />

                    <Input
                      label="Expires At (Optional)"
                      type="datetime-local"
                      {...register('expiresAt')}
                      error={errors.expiresAt?.message}
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Job Image (Optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-teal-500 file:text-white hover:file:bg-teal-600"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        borderWidth: '2px',
                        borderStyle: 'solid',
                      }}
                    />
                    {imagePreview && (
                      <div className="mt-3">
                        <img src={imagePreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg" />
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-4 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        router.back();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={loading}
                      className="flex-1"
                    >
                      Post Urgent Job
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

export default function PostUrgentJobPage() {
  return <PostUrgentJobContent />;
}

