'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { ProfilePictureUpload } from '@/components/dashboard/ProfilePictureUpload';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { kycApi, certificationsApi } from '@/lib/api-client';
import type { Certification } from '@/types/api';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import Link from 'next/link';

interface KYCStatus {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED';
  submittedAt?: string;
  verifiedAt?: string;
  rejectionReason?: string;
}

function ProfileContent() {
  const { user, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [loadingKYC, setLoadingKYC] = useState(true);
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [loadingCertifications, setLoadingCertifications] = useState(true);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  useEffect(() => {
    const fetchKYC = async () => {
      if (!user?.id || !user?.role) return;
      
      // Admins don't need KYC verification
      if (user.role === 'ADMIN') {
        setLoadingKYC(false);
        return;
      }
      
      try {
        setLoadingKYC(true);
        // Only fetch for INDIVIDUAL or INDUSTRIAL
        if (user.role === 'INDIVIDUAL' || user.role === 'INDUSTRIAL') {
          const kycData = await kycApi.getKYC(user.id, user.role);
          if (kycData) {
            setKycStatus({
              status: kycData.status,
              submittedAt: kycData.submittedAt,
              verifiedAt: kycData.verifiedAt,
              rejectionReason: kycData.rejectionReason,
            });
          } else {
            setKycStatus(null);
          }
        }
      } catch (error) {
        // Only log unexpected errors (404 is handled in getKYC)
        console.error('Error fetching KYC:', error);
        setKycStatus(null);
      } finally {
        setLoadingKYC(false);
      }
    };

    fetchKYC();
  }, [user?.id, user?.role]);

  useEffect(() => {
    const fetchCertifications = async () => {
      if (!user?.id) return;
      
      try {
        setLoadingCertifications(true);
        const response = await certificationsApi.getUserCertifications(user.id);
        // Handle both array and object with data property
        if (Array.isArray(response)) {
          setCertifications(response);
        } else if (response && typeof response === 'object' && 'data' in response) {
          setCertifications(Array.isArray(response.data) ? response.data : []);
        } else {
          setCertifications([]);
        }
      } catch (error: any) {
        // 404 is expected if user has no certifications
        if (error.response?.status !== 404) {
          console.error('Error fetching certifications:', error);
        }
        setCertifications([]);
      } finally {
        setLoadingCertifications(false);
      }
    };

    fetchCertifications();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    // Validate form data
    if (!formData.firstName || !formData.lastName) {
      toast.error('First name and last name are required');
      return;
    }

    if (!formData.phone) {
      toast.error('Phone number is required');
      return;
    }

    setSaving(true);
    try {
      const response = await api.patch(API_ENDPOINTS.AUTH.UPDATE_PROFILE, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      });

      if (response.data.success) {
        toast.success('Profile updated successfully!');
        setIsEditing(false);
        await refreshUser();
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error: any) {
      console.error('Error updating profile:', error);
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-8">My Profile</h1>

          {/* Profile Picture Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.2)',
            }}
          >
            <h2 className="text-2xl font-bold text-white mb-6">Profile Picture</h2>
            <div className="flex items-center gap-6">
              <ProfilePictureUpload
                currentImage={user?.profileImage}
                onUploadSuccess={async () => {
                  await refreshUser();
                }}
              />
              <div>
                <p className="text-gray-400 text-sm mb-2">
                  Upload a profile picture to personalize your account
                </p>
                <p className="text-gray-500 text-xs">
                  Recommended: Square image, at least 400x400px. Max 5MB.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Profile Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.2)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Profile Information</h2>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setFormData({
                        firstName: user?.firstName || '',
                        lastName: user?.lastName || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
              />
              <Input
                label="Last Name"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                disabled
                className="opacity-60"
              />
              <Input
                label="Phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
              />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-800/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400 mb-1">Role</p>
                  <p className="text-white font-semibold">{user?.role}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Status</p>
                  <p className="text-white font-semibold">{user?.status}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Email Verified</p>
                  <p className="text-white font-semibold">
                    {user?.isEmailVerified ? 'Yes' : 'No'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 mb-1">Member Since</p>
                  <p className="text-white font-semibold">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* KYC Status Section */}
          {!loadingKYC && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: kycStatus?.status === 'APPROVED' 
                  ? 'oklch(0.7 0.15 180 / 0.3)' 
                  : kycStatus?.status === 'REJECTED'
                  ? 'oklch(0.65 0.2 330 / 0.3)'
                  : 'oklch(0.8 0.15 60 / 0.3)',
              }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white">KYC Verification</h2>
                {!kycStatus && (
                  <Link href={user?.role === 'INDIVIDUAL' ? '/kyc/individual' : '/kyc/industrial'}>
                    <Button variant="primary" size="sm">
                      Complete KYC
                    </Button>
                  </Link>
                )}
              </div>

              {kycStatus ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`px-4 py-2 rounded-lg font-semibold ${
                      kycStatus.status === 'APPROVED' 
                        ? 'bg-green-500/20 text-green-400'
                        : kycStatus.status === 'REJECTED'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {kycStatus.status === 'APPROVED' && '✓ Approved'}
                      {kycStatus.status === 'REJECTED' && '✗ Rejected'}
                      {kycStatus.status === 'PENDING' && '⏳ Pending Review'}
                      {kycStatus.status === 'RESUBMITTED' && '↻ Resubmitted'}
                    </div>
                  </div>
                  
                  {kycStatus.submittedAt && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Submitted</p>
                      <p className="text-white">
                        {new Date(kycStatus.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {kycStatus.verifiedAt && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Verified</p>
                      <p className="text-white">
                        {new Date(kycStatus.verifiedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {kycStatus.rejectionReason && (
                    <div>
                      <p className="text-gray-400 text-sm mb-1">Rejection Reason</p>
                      <p className="text-red-400">{kycStatus.rejectionReason}</p>
                    </div>
                  )}

                  {kycStatus.status === 'REJECTED' && (
                    <Link href={user?.role === 'INDIVIDUAL' ? '/kyc/individual' : '/kyc/industrial'}>
                      <Button variant="outline" size="sm" className="mt-4">
                        Resubmit KYC
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    You haven't completed your KYC verification yet.
                  </p>
                  <Link href={user?.role === 'INDIVIDUAL' ? '/kyc/individual' : '/kyc/industrial'}>
                    <Button variant="primary" size="md">
                      Complete KYC Now
                    </Button>
                  </Link>
                </div>
              )}
            </motion.div>
          )}

          {/* Certifications Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 p-6 rounded-2xl border-2 backdrop-blur-xl"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.6)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">My Certifications</h2>
              {certifications.length > 0 && (
                <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-400 text-sm font-semibold">
                  {certifications.length} {certifications.length === 1 ? 'Certificate' : 'Certificates'}
                </span>
              )}
            </div>

            {loadingCertifications ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-400"></div>
              </div>
            ) : certifications.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <p className="text-gray-400 mb-4">No certifications yet</p>
                <p className="text-gray-500 text-sm">Complete exams or training courses to earn certifications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {certifications.map((cert) => (
                  <motion.div
                    key={cert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border backdrop-blur-sm"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.4)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-2">{cert.title}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Category</p>
                            <p className="text-white">{cert.category || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Issued Date</p>
                            <p className="text-white">
                              {cert.issuedDate ? new Date(cert.issuedDate).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                          {cert.expiryDate && (
                            <div>
                              <p className="text-gray-400 mb-1">Expiry Date</p>
                              <p className="text-white">{new Date(cert.expiryDate).toLocaleDateString()}</p>
                            </div>
                          )}
                          {cert.verificationCode && (
                            <div>
                              <p className="text-gray-400 mb-1">Verification Code</p>
                              <div className="flex items-center gap-2">
                                <code className="px-2 py-1 rounded bg-gray-800 text-teal-400 text-xs font-mono">
                                  {cert.verificationCode}
                                </code>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(cert.verificationCode);
                                    toast.success('Verification code copied!');
                                  }}
                                  className="text-gray-400 hover:text-teal-400 transition-colors"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          )}
                          {cert.certificateNumber && (
                            <div>
                              <p className="text-gray-400 mb-1">Certificate Number</p>
                              <p className="text-white font-mono text-xs">{cert.certificateNumber}</p>
                            </div>
                          )}
                        </div>
                        {cert.certificateUrl && (
                          <div className="mt-3">
                            <a
                              href={cert.certificateUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Certificate
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}

