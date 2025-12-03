'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { kycApi } from '@/lib/api-client';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  section?: string;
}

const getNavItems = (userRole?: string): NavItem[] => {
  const baseItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ) },
  ];

  if (userRole === 'ADMIN') {
    // Admin navigation
    return [
      ...baseItems,
      { label: 'KYC Management', href: '/dashboard/admin/kyc', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ), section: 'Administration' },
      { label: 'Job Verification', href: '/dashboard/admin/jobs', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ), section: 'Administration' },
      { label: 'User Management', href: '/dashboard/admin/users', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ), section: 'Administration' },
      { label: 'Exam Management', href: '/dashboard/admin/exams', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ), section: 'Administration' },
      { label: 'Exam Bookings', href: '/dashboard/admin/exams/bookings', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ), section: 'Administration' },
      { label: 'Event Management', href: '/dashboard/admin/events', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ), section: 'Administration' },
      { label: 'Certifications', href: '/dashboard/admin/certifications', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
        </svg>
      ), section: 'Administration' },
      { label: 'Training Courses', href: '/dashboard/admin/training', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ), section: 'Administration' },
      { label: 'Training Enrollments', href: '/dashboard/admin/training/enrollments', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ), section: 'Administration' },
      { label: 'Analytics', href: '/dashboard/admin/analytics', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ), section: 'Administration' },
    ];
  } else if (userRole === 'INDUSTRIAL') {
    // Employer navigation
    return [
      ...baseItems,
      { label: 'KYC Verification', href: '/kyc/industrial', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ), section: 'Verification' },
      { label: 'My Jobs', href: '/dashboard/employer/jobs', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ), section: 'Employer' },
      { label: 'Post Job', href: '/dashboard/employer/post-job', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ), section: 'Employer' },
      { label: 'My Courses', href: '/dashboard/employer/training', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ), section: 'Training' },
      { label: 'Create Course', href: '/dashboard/employer/training/create', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ), section: 'Training' },
    ];
  } else {
    // Job seeker navigation
    return [
      ...baseItems,
      { label: 'KYC Verification', href: '/kyc/individual', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ), section: 'Verification' },
      { label: 'Jobs', href: '/dashboard/jobs', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ), section: 'Marketplace' },
      { label: 'Urgent Jobs', href: '/dashboard/urgent-jobs', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ), section: 'Marketplace' },
      { label: 'Applications', href: '/dashboard/applications', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ), section: 'Marketplace' },
      { label: 'Training', href: '/dashboard/training', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ), section: 'Learning' },
      { label: 'My Trainings', href: '/dashboard/training/my-trainings', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ), section: 'Learning' },
      { label: 'Events', href: '/dashboard/events', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ), section: 'Community' },
      { label: 'Exams', href: '/dashboard/exams', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ), section: 'Skills' },
      { label: 'My Exam Bookings', href: '/dashboard/exams/my-bookings', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ), section: 'Skills' },
    ];
  }
};

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout, refreshUser } = useAuth();
  const hasRefreshedRef = useRef(false);
  const [kycStatus, setKycStatus] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'RESUBMITTED' | null | undefined>(undefined);
  const [kycStatusLoading, setKycStatusLoading] = useState(true);

  // Refresh user data when component mounts to ensure profile picture and name are loaded
  // Only refresh once if user data is missing
  useEffect(() => {
    if (user?.id && (!user.profileImage || !user.firstName || !user.lastName) && !hasRefreshedRef.current) {
      // If user exists but missing profile data, refresh it (only once)
      hasRefreshedRef.current = true;
      refreshUser();
    }
    // Reset ref when user changes
    if (user?.id && user.profileImage && user.firstName && user.lastName) {
      hasRefreshedRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.profileImage, user?.firstName, user?.lastName]);

  // Fetch KYC status to hide KYC Verification link when approved
  useEffect(() => {
    const fetchKYCStatus = async () => {
      if (!user?.id || !user?.role || user.role === 'ADMIN') {
        setKycStatus(null);
        setKycStatusLoading(false);
        return;
      }

      if (user.role === 'INDIVIDUAL' || user.role === 'INDUSTRIAL') {
        try {
          setKycStatusLoading(true);
          const kycData = await kycApi.getKYC(user.id, user.role);
          if (kycData) {
            setKycStatus(kycData.status || null);
          } else {
            setKycStatus(null);
          }
        } catch (error) {
          setKycStatus(null);
        } finally {
          setKycStatusLoading(false);
        }
      } else {
        setKycStatusLoading(false);
      }
    };

    fetchKYCStatus();
  }, [user?.id, user?.role]);

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  let navItems = getNavItems(user?.role);
  
  // Filter out KYC Verification if KYC is approved, pending, or resubmitted
  // Only show KYC Verification link if:
  // - KYC is null (not submitted) - user can apply
  // - KYC is REJECTED - user can resubmit
  // Hide if:
  // - KYC is APPROVED - already verified, no need to show
  // - KYC is PENDING - already submitted, waiting for approval
  // - KYC is RESUBMITTED - already resubmitted, waiting for approval
  // Only filter when we've finished loading KYC status to prevent flash
  if (!kycStatusLoading && (kycStatus === 'APPROVED' || kycStatus === 'PENDING' || kycStatus === 'RESUBMITTED')) {
    navItems = navItems.filter(item => item.label !== 'KYC Verification');
  }
  
  // Don't show KYC Verification link while loading (prevents flash)
  if (kycStatusLoading && (user?.role === 'INDIVIDUAL' || user?.role === 'INDUSTRIAL')) {
    navItems = navItems.filter(item => item.label !== 'KYC Verification');
  }
  
  // Add common items for all users (except admins don't need wallet)
  const commonItems: NavItem[] = [];
  
  // Wallet only for non-admin users
  if (user?.role !== 'ADMIN') {
    commonItems.push({ label: 'Wallet', href: '/dashboard/wallet', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ), section: 'My Profile' });
  }
  
  // Settings for all users
  commonItems.push({ label: 'Settings', href: '/dashboard/settings', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ), section: 'My Profile' });

  const allNavItems = [...navItems, ...commonItems];
  const groupedItems = allNavItems.reduce((acc, item) => {
    const section = item.section || 'Main';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-black/40 backdrop-blur-xl border-r border-gray-800/50 flex flex-col z-40 hidden lg:flex">
      {/* User Profile */}
      <Link href="/dashboard/profile">
        <motion.div
          whileHover={{ backgroundColor: 'oklch(0.15 0 0 / 0.5)' }}
          className="p-6 border-b border-gray-800/50 cursor-pointer transition-all"
        >
          <div className="flex items-center gap-3">
            {user?.profileImage ? (
              <div className="relative">
                <img
                  src={user.profileImage}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="w-12 h-12 rounded-full object-cover border-2"
                  style={{ borderColor: 'oklch(0.7 0.15 180 / 0.5)' }}
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-black"></div>
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {getInitials(user?.firstName, user?.lastName)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-gray-400 text-xs truncate">{user?.email}</p>
            </div>
          </div>
        </motion.div>
      </Link>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        {Object.entries(groupedItems).map(([section, items]) => (
          <div key={section} className="mb-6">
            {section !== 'Main' && (
              <p className="px-6 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                {section}
              </p>
            )}
            <nav className="space-y-1 px-3">
              {items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200
                        ${isActive
                          ? 'bg-gradient-to-r from-teal-500/20 to-purple-500/20 border border-teal-500/30'
                          : 'hover:bg-gray-800/30'
                        }
                      `}
                    >
                      <span className={isActive ? 'text-teal-400' : 'text-gray-400'}>
                        {item.icon}
                      </span>
                      <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {item.label}
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-gray-800/50">
        <motion.button
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg w-full hover:bg-red-500/10 transition-all duration-200 group"
        >
          <svg className="w-5 h-5 text-gray-400 group-hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-sm font-medium text-gray-300 group-hover:text-red-400">Log Out</span>
        </motion.button>
      </div>
    </div>
  );
};

