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
import { kycApi } from '@/lib/api-client';
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
      
      try {
        setLoadingKYC(true);
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

