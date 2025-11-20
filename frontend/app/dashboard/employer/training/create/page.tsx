'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { trainingApi, kycApi } from '@/lib/api-client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { TrainingCourse } from '@/types/api';

const TRAINING_MODES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'ONLINE', label: 'Online' },
  { value: 'HYBRID', label: 'Hybrid' },
];

const CATEGORIES = [
  { value: 'Technical', label: 'Technical' },
  { value: 'Soft Skills', label: 'Soft Skills' },
  { value: 'Management', label: 'Management' },
  { value: 'Language', label: 'Language' },
  { value: 'Certification', label: 'Certification' },
  { value: 'Other', label: 'Other' },
];

interface CourseFormData {
  title: string;
  description: string;
  category: string;
  duration: string;
  mode: string;
  price: string;
  isFree: boolean;
  syllabus: string[];
  prerequisites: string[];
  learningOutcomes: string[];
  readingMaterials: string[];
  videoMaterials: string[];
  startDate: string;
  endDate: string;
  seats: string;
}

function CreateCourseContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [kycApproved, setKycApproved] = useState(false);
  const [syllabusItems, setSyllabusItems] = useState<string[]>(['']);
  const [prerequisitesItems, setPrerequisitesItems] = useState<string[]>(['']);
  const [learningOutcomesItems, setLearningOutcomesItems] = useState<string[]>(['']);
  const [readingMaterials, setReadingMaterials] = useState<string[]>(['']);
  const [videoMaterials, setVideoMaterials] = useState<string[]>(['']);

  const [formData, setFormData] = useState<CourseFormData>({
    title: '',
    description: '',
    category: 'Technical',
    duration: '',
    mode: 'ONLINE',
    price: '0',
    isFree: false,
    syllabus: [],
    prerequisites: [],
    learningOutcomes: [],
    readingMaterials: [],
    videoMaterials: [],
    startDate: '',
    endDate: '',
    seats: '',
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
        toast.error('Your industrial KYC must be approved to create courses');
        router.push('/kyc/industrial');
      }
    } catch (error) {
      setKycApproved(false);
    }
  };

  const handleChange = (field: keyof CourseFormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSyllabusItem = () => {
    setSyllabusItems([...syllabusItems, '']);
  };

  const updateSyllabusItem = (index: number, value: string) => {
    const updated = [...syllabusItems];
    updated[index] = value;
    setSyllabusItems(updated);
  };

  const removeSyllabusItem = (index: number) => {
    setSyllabusItems(syllabusItems.filter((_, i) => i !== index));
  };

  const addPrerequisiteItem = () => {
    setPrerequisitesItems([...prerequisitesItems, '']);
  };

  const updatePrerequisiteItem = (index: number, value: string) => {
    const updated = [...prerequisitesItems];
    updated[index] = value;
    setPrerequisitesItems(updated);
  };

  const removePrerequisiteItem = (index: number) => {
    setPrerequisitesItems(prerequisitesItems.filter((_, i) => i !== index));
  };

  const addLearningOutcomeItem = () => {
    setLearningOutcomesItems([...learningOutcomesItems, '']);
  };

  const updateLearningOutcomeItem = (index: number, value: string) => {
    const updated = [...learningOutcomesItems];
    updated[index] = value;
    setLearningOutcomesItems(updated);
  };

  const removeLearningOutcomeItem = (index: number) => {
    setLearningOutcomesItems(learningOutcomesItems.filter((_, i) => i !== index));
  };

  const addReadingMaterial = () => {
    setReadingMaterials([...readingMaterials, '']);
  };

  const updateReadingMaterial = (index: number, value: string) => {
    const updated = [...readingMaterials];
    updated[index] = value;
    setReadingMaterials(updated);
  };

  const removeReadingMaterial = (index: number) => {
    setReadingMaterials(readingMaterials.filter((_, i) => i !== index));
  };

  const addVideoMaterial = () => {
    setVideoMaterials([...videoMaterials, '']);
  };

  const updateVideoMaterial = (index: number, value: string) => {
    const updated = [...videoMaterials];
    updated[index] = value;
    setVideoMaterials(updated);
  };

  const removeVideoMaterial = (index: number) => {
    setVideoMaterials(videoMaterials.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    if (!kycApproved) {
      toast.error('Your industrial KYC must be approved to create courses');
      router.push('/kyc/industrial');
      return;
    }

    // Validation
    if (!formData.title.trim()) {
      toast.error('Course title is required');
      return;
    }

    const getTextLength = (html: string): number => {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent?.trim().length || 0;
    };

    const descriptionLength = getTextLength(formData.description);
    if (!formData.description.trim() || descriptionLength < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    if (!formData.duration || parseInt(formData.duration) < 1) {
      toast.error('Duration must be at least 1 hour');
      return;
    }

    if (!formData.isFree && (!formData.price || parseFloat(formData.price) < 0)) {
      toast.error('Price must be a valid positive number');
      return;
    }

    // Validate dates
    if (formData.startDate && new Date(formData.startDate) < new Date()) {
      toast.error('Start date must be in the future');
      return;
    }

    if (formData.endDate && formData.startDate && new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date must be after start date');
      return;
    }

    setLoading(true);
    try {
      const courseData: any = {
        providerId: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        duration: parseInt(formData.duration),
        mode: formData.mode,
        price: formData.isFree ? 0 : parseFloat(formData.price),
        isFree: formData.isFree,
        syllabus: syllabusItems.filter(item => item.trim()).length > 0 ? syllabusItems.filter(item => item.trim()) : undefined,
        prerequisites: prerequisitesItems.filter(item => item.trim()).length > 0 ? prerequisitesItems.filter(item => item.trim()) : undefined,
        learningOutcomes: learningOutcomesItems.filter(item => item.trim()).length > 0 ? learningOutcomesItems.filter(item => item.trim()) : undefined,
        readingMaterials: readingMaterials.filter(item => item.trim()).length > 0 ? readingMaterials.filter(item => item.trim()) : undefined,
        videoMaterials: videoMaterials.filter(item => item.trim()).length > 0 ? videoMaterials.filter(item => item.trim()) : undefined,
      };

      if (formData.startDate) {
        courseData.startDate = new Date(formData.startDate).toISOString();
      }

      if (formData.endDate) {
        courseData.endDate = new Date(formData.endDate).toISOString();
      }

      if (formData.seats && parseInt(formData.seats) > 0) {
        courseData.seats = parseInt(formData.seats);
      }

      await trainingApi.create(courseData);
      toast.success('Course created successfully!');
      router.push('/dashboard/employer/training');
    } catch (error: any) {
      console.error('Error creating course:', error);
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== 'INDUSTRIAL') {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8">
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">This page is only available for training providers</p>
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
            <Link href="/dashboard/employer/training">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to My Courses</span>
              </motion.button>
            </Link>
            <h1 className="text-4xl font-bold text-white mb-2">Create Training Course</h1>
            <p className="text-gray-400">Fill in the details to create a new training course</p>
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
                  label="Course Title *"
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  placeholder="e.g., Full Stack Web Development"
                  required
                  disabled={loading}
                />

                <RichTextEditor
                  label="Course Description *"
                  value={formData.description}
                  onChange={(value) => handleChange('description', value)}
                  placeholder="Describe the course content, objectives, and what students will learn..."
                  disabled={loading}
                  minHeight={200}
                  helperText="Use the toolbar to format your text with headings, lists, bold, italic, and links."
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                      required
                      disabled={loading}
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Mode *</label>
                    <select
                      value={formData.mode}
                      onChange={(e) => handleChange('mode', e.target.value)}
                      className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                      style={{
                        backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      }}
                      required
                      disabled={loading}
                    >
                      {TRAINING_MODES.map((mode) => (
                        <option key={mode.value} value={mode.value}>
                          {mode.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Duration (Hours) *"
                    type="number"
                    value={formData.duration}
                    onChange={(e) => handleChange('duration', e.target.value)}
                    placeholder="e.g., 40"
                    required
                    min="1"
                    disabled={loading}
                  />

                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <input
                        type="checkbox"
                        id="isFree"
                        checked={formData.isFree}
                        onChange={(e) => handleChange('isFree', e.target.checked)}
                        className="w-5 h-5 rounded border-2"
                        style={{
                          backgroundColor: formData.isFree ? 'oklch(0.7 0.15 180)' : 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                        }}
                        disabled={loading}
                      />
                      <label htmlFor="isFree" className="text-sm text-gray-300 cursor-pointer">
                        Free Course
                      </label>
                    </div>
                    {!formData.isFree && (
                      <Input
                        label="Price (Rs.) *"
                        type="number"
                        value={formData.price}
                        onChange={(e) => handleChange('price', e.target.value)}
                        placeholder="e.g., 5000"
                        min="0"
                        disabled={loading}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Syllabus */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-4">Syllabus (Optional)</h2>
              <div className="space-y-3">
                {syllabusItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      value={item}
                      onChange={(e) => updateSyllabusItem(index, e.target.value)}
                      placeholder={`Syllabus item ${index + 1}`}
                      disabled={loading}
                      className="flex-1"
                    />
                    {syllabusItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeSyllabusItem(index)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSyllabusItem}
                  disabled={loading}
                >
                  + Add Syllabus Item
                </Button>
              </div>
            </div>

            {/* Prerequisites */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-4">Prerequisites (Optional)</h2>
              <div className="space-y-3">
                {prerequisitesItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      value={item}
                      onChange={(e) => updatePrerequisiteItem(index, e.target.value)}
                      placeholder={`Prerequisite ${index + 1}`}
                      disabled={loading}
                      className="flex-1"
                    />
                    {prerequisitesItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removePrerequisiteItem(index)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addPrerequisiteItem}
                  disabled={loading}
                >
                  + Add Prerequisite
                </Button>
              </div>
            </div>

            {/* Learning Outcomes */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-4">Learning Outcomes (Optional)</h2>
              <div className="space-y-3">
                {learningOutcomesItems.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      type="text"
                      value={item}
                      onChange={(e) => updateLearningOutcomeItem(index, e.target.value)}
                      placeholder={`Learning outcome ${index + 1}`}
                      disabled={loading}
                      className="flex-1"
                    />
                    {learningOutcomesItems.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeLearningOutcomeItem(index)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLearningOutcomeItem}
                  disabled={loading}
                >
                  + Add Learning Outcome
                </Button>
              </div>
            </div>

            {/* Materials */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-4">Course Materials (Optional)</h2>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Reading Materials (URLs)</h3>
                  <div className="space-y-3">
                    {readingMaterials.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="url"
                          value={item}
                          onChange={(e) => updateReadingMaterial(index, e.target.value)}
                          placeholder="https://example.com/article"
                          disabled={loading}
                          className="flex-1"
                        />
                        {readingMaterials.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeReadingMaterial(index)}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addReadingMaterial}
                      disabled={loading}
                    >
                      + Add Reading Material
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Video Materials (URLs)</h3>
                  <div className="space-y-3">
                    {videoMaterials.map((item, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="url"
                          value={item}
                          onChange={(e) => updateVideoMaterial(index, e.target.value)}
                          placeholder="https://youtube.com/watch?v=..."
                          disabled={loading}
                          className="flex-1"
                        />
                        {videoMaterials.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removeVideoMaterial(index)}
                            disabled={loading}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addVideoMaterial}
                      disabled={loading}
                    >
                      + Add Video Material
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scheduling */}
            <div className="p-6 rounded-2xl border-2 backdrop-blur-xl" style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}>
              <h2 className="text-2xl font-bold text-white mb-6">Scheduling (Optional)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  disabled={loading}
                />

                <Input
                  label="End Date"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  min={formData.startDate || new Date().toISOString().slice(0, 16)}
                  disabled={loading}
                />

                <Input
                  label="Available Seats (Optional)"
                  type="number"
                  value={formData.seats}
                  onChange={(e) => handleChange('seats', e.target.value)}
                  placeholder="Leave empty for unlimited"
                  min="1"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-6">
              <Link href="/dashboard/employer/training">
                <Button type="button" variant="outline" disabled={loading}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create Course'}
              </Button>
            </div>
          </motion.form>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function CreateCoursePage() {
  return (
    <ProtectedRoute>
      <CreateCourseContent />
    </ProtectedRoute>
  );
}

