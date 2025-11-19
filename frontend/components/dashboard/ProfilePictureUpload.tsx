'use client';

import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { User } from '@/types/api';
import toast from 'react-hot-toast';

interface ProfilePictureUploadProps {
  currentImage?: string;
  onUploadSuccess?: (imageUrl: string) => void;
}

export const ProfilePictureUpload: React.FC<ProfilePictureUploadProps> = ({
  currentImage,
  onUploadSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const { refreshUser } = useAuth();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    handleUpload(file);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<{
        success: boolean;
        data: User;
        message?: string;
      }>(API_ENDPOINTS.AUTH.UPDATE_PROFILE_PICTURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success && response.data.data?.profileImage) {
        toast.success('Profile picture updated successfully!');
        setPreview(null);
        await refreshUser();
        onUploadSuccess?.(response.data.data.profileImage);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(
        error.response?.data?.message || 'Failed to upload profile picture'
      );
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const { user } = useAuth();
  const displayImage = preview || currentImage;

  return (
    <div className="relative inline-block">
      <div className="relative">
        {displayImage ? (
          <img
            src={displayImage}
            alt="Profile"
            className="w-24 h-24 rounded-full object-cover border-4"
            style={{ borderColor: 'oklch(0.7 0.15 180 / 0.5)' }}
          />
        ) : (
          <div
            className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl border-4"
            style={{ borderColor: 'oklch(0.7 0.15 180 / 0.5)' }}
          >
            {getInitials(user?.firstName, user?.lastName)}
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-400"></div>
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-purple-600 flex items-center justify-center shadow-lg border-2 border-black"
        >
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </motion.button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
