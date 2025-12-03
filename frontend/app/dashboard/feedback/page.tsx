'use client';

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { feedbackApi } from '@/lib/api-client';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function FeedbackPage() {
  return (
    <ProtectedRoute>
      <FeedbackContent />
    </ProtectedRoute>
  );
}

function FeedbackContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: 'GENERAL_FEEDBACK' as 'BUG_REPORT' | 'FEATURE_REQUEST' | 'GENERAL_FEEDBACK' | 'COMPLAINT' | 'SUGGESTION',
    category: 'OTHER' as 'UI_UX' | 'FUNCTIONALITY' | 'PERFORMANCE' | 'SECURITY' | 'CONTENT' | 'OTHER',
    title: '',
    description: '',
    rating: undefined as number | undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.description.length < 10) {
      toast.error('Description must be at least 10 characters');
      return;
    }

    try {
      setLoading(true);
      await feedbackApi.create({
        type: formData.type,
        category: formData.category,
        title: formData.title.trim(),
        description: formData.description.trim(),
        rating: formData.rating,
      });
      
      toast.success('Thank you for your feedback! We appreciate your input.');
      setFormData({
        type: 'GENERAL_FEEDBACK',
        category: 'OTHER',
        title: '',
        description: '',
        rating: undefined,
      });
    } catch (error: any) {
      console.error('Error submitting feedback:', error);
      toast.error(error.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Share Your Feedback</h1>
            <p className="text-gray-400">
              Help us improve! Your feedback is valuable to us as we prepare for launch.
            </p>
          </div>

          {/* Feedback Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            {/* Feedback Type */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Feedback Type <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
                required
              >
                <option value="GENERAL_FEEDBACK">General Feedback</option>
                <option value="BUG_REPORT">Bug Report</option>
                <option value="FEATURE_REQUEST">Feature Request</option>
                <option value="SUGGESTION">Suggestion</option>
                <option value="COMPLAINT">Complaint</option>
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-4 py-3 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
                required
              >
                <option value="UI_UX">UI/UX</option>
                <option value="FUNCTIONALITY">Functionality</option>
                <option value="PERFORMANCE">Performance</option>
                <option value="SECURITY">Security</option>
                <option value="CONTENT">Content</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Brief summary of your feedback"
                maxLength={200}
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.title.length}/200 characters</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide detailed feedback..."
                rows={8}
                maxLength={5000}
                className="w-full px-4 py-3 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2 resize-none"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                }}
                required
              />
              <p className="text-xs text-gray-500 mt-1">{formData.description.length}/5000 characters</p>
            </div>

            {/* Rating (Optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Overall Rating (Optional)
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setFormData({ ...formData, rating: formData.rating === rating ? undefined : rating })}
                    className={`w-12 h-12 rounded-lg text-xl transition-all ${
                      formData.rating && formData.rating >= rating
                        ? 'text-yellow-400'
                        : 'text-gray-500'
                    }`}
                    style={{
                      backgroundColor: formData.rating && formData.rating >= rating
                        ? 'oklch(0.7 0.15 60 / 0.2)'
                        : 'oklch(0.1 0 0 / 0.5)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                      borderWidth: '2px',
                      borderStyle: 'solid',
                    }}
                  >
                    ⭐
                  </button>
                ))}
                {formData.rating && (
                  <span className="text-gray-400 text-sm ml-2">
                    {formData.rating === 5 ? 'Excellent' :
                     formData.rating === 4 ? 'Good' :
                     formData.rating === 3 ? 'Average' :
                     formData.rating === 2 ? 'Poor' : 'Very Poor'}
                  </span>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center gap-4">
              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-8 py-3 rounded-lg text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'oklch(0.7 0.15 180 / 0.8)',
                }}
              >
                {loading ? 'Submitting...' : 'Submit Feedback'}
              </motion.button>
              <button
                type="button"
                onClick={() => router.push('/dashboard/feedback/my-feedback')}
                className="px-6 py-3 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
                style={{
                  backgroundColor: 'oklch(0.1 0 0 / 0.5)',
                  borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                  borderWidth: '2px',
                  borderStyle: 'solid',
                }}
              >
                View My Feedback
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </DashboardLayout>
  );
}

