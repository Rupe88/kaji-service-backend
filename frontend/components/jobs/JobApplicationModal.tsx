'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { applicationsApi } from '@/lib/api-client';
import { API_ENDPOINTS } from '@/lib/constants';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface JobApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  applicantId: string;
  onSuccess: () => void;
}

export const JobApplicationModal: React.FC<JobApplicationModalProps> = ({
  isOpen,
  onClose,
  jobId,
  applicantId,
  onSuccess,
}) => {
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeFileName, setResumeFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (PDF, DOC, DOCX)
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Resume size must be less than 10MB');
      return;
    }

    setResumeFile(file);
    setResumeFileName(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resumeFile) {
      toast.error('Please upload your resume');
      return;
    }

    // Validate portfolio URL if provided
    if (portfolioUrl && !isValidUrl(portfolioUrl)) {
      toast.error('Please enter a valid portfolio URL');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('jobId', jobId);
      formData.append('applicantId', applicantId);
      if (coverLetter.trim()) {
        formData.append('coverLetter', coverLetter.trim());
      }
      if (portfolioUrl.trim()) {
        formData.append('portfolioUrl', portfolioUrl.trim());
      }
      formData.append('file', resumeFile); // Backend expects 'file' field name

      const response = await api.post(API_ENDPOINTS.APPLICATIONS.CREATE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        toast.success('Application submitted successfully!');
        // Reset form
        setCoverLetter('');
        setPortfolioUrl('');
        setResumeFile(null);
        setResumeFileName('');
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        onSuccess();
        onClose();
      } else {
        toast.error(response.data.message || 'Failed to submit application');
      }
    } catch (error: any) {
      console.error('Application submission error:', error);
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to submit application');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isValidUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    setResumeFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-2xl rounded-2xl border-2 backdrop-blur-xl p-6 max-h-[90vh] overflow-y-auto"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.9)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Apply for Job</h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                  disabled={submitting}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Resume Upload */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Resume <span className="text-red-400">*</span>
                  </label>
                  {!resumeFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-teal-500/50"
                      style={{
                        borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                        backgroundColor: 'oklch(0.1 0 0 / 0.5)',
                      }}
                    >
                      <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="text-gray-300 mb-1">Click to upload resume</p>
                      <p className="text-gray-500 text-sm">PDF or Word document (max 10MB)</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-4 rounded-xl border-2" style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.5)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}>
                      <div className="flex items-center gap-3">
                        <svg className="w-8 h-8 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <div>
                          <p className="text-white font-medium">{resumeFileName}</p>
                          <p className="text-gray-400 text-sm">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveResume}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        disabled={submitting}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={submitting}
                  />
                </div>

                {/* Cover Letter */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Cover Letter (Optional)
                  </label>
                  <textarea
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={6}
                    maxLength={5000}
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2 resize-none"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                    placeholder="Tell us why you're interested in this position..."
                    disabled={submitting}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {coverLetter.length} / 5000 characters
                  </p>
                </div>

                {/* Portfolio URL */}
                <div>
                  <Input
                    label="Portfolio URL (Optional)"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.com"
                    disabled={submitting}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800/50">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting || !resumeFile}
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

