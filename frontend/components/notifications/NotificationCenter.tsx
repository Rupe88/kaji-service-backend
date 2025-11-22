'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocket, NotificationData } from '@/hooks/useSocket';
import { useAuth } from '@/hooks/useAuth';

const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return time.toLocaleDateString();
};

export const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, readNotifications, markAsRead, clearNotifications } = useSocket();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleNotificationClick = (index: number, notification: NotificationData) => {
    markAsRead(index);
    
    // Handle navigation based on notification type and user role
    if (notification.data) {
      if (notification.type === 'JOB_APPLICATION' && notification.data.jobId) {
        // For employers, navigate to applications page; for job seekers, navigate to job details
        if (user?.role === 'INDUSTRIAL') {
          window.location.href = `/dashboard/employer/jobs/${notification.data.jobId}/applications`;
        } else {
          window.location.href = `/dashboard/jobs/${notification.data.jobId}`;
        }
      } else if (notification.type === 'APPLICATION_STATUS' && notification.data.applicationId) {
        window.location.href = `/dashboard/applications`;
      } else if (notification.type === 'KYC_STATUS') {
        // Navigate to appropriate KYC page based on user role
        if (user?.role === 'INDUSTRIAL') {
          window.location.href = `/kyc/industrial`;
        } else {
          window.location.href = `/kyc/individual`;
        }
      } else if (notification.type === 'KYC_SUBMITTED' && user?.role === 'ADMIN') {
        // Navigate admins to KYC management page
        window.location.href = `/dashboard/admin/kyc`;
      } else if (notification.type === 'JOB_VERIFICATION' && notification.data.jobId) {
        window.location.href = `/dashboard/employer/jobs/${notification.data.jobId}`;
      }
    }
    
    setIsOpen(false);
  };

  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'JOB_APPLICATION':
        return '📝';
      case 'APPLICATION_STATUS':
        return '📋';
      case 'KYC_STATUS':
        return '✅';
      case 'KYC_SUBMITTED':
        return '📄';
      case 'JOB_VERIFICATION':
        return '✓';
      default:
        return '🔔';
    }
  };

  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'JOB_APPLICATION':
        return 'oklch(0.7 0.15 240)'; // Blue
      case 'APPLICATION_STATUS':
        return 'oklch(0.7 0.15 180)'; // Teal
      case 'KYC_STATUS':
        return 'oklch(0.7 0.15 140)'; // Green
      case 'KYC_SUBMITTED':
        return 'oklch(0.7 0.15 200)'; // Cyan
      case 'JOB_VERIFICATION':
        return 'oklch(0.7 0.15 60)'; // Yellow/Orange
      default:
        return 'oklch(0.7 0.15 300)'; // Purple
    }
  };

  const isUnread = (notification: NotificationData, index: number): boolean => {
    // Check if notification is in the readNotifications set
    const notificationId = notification.timestamp + notification.type;
    return !readNotifications.has(notificationId);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-10 h-10 rounded-lg transition-all"
        style={{
          backgroundColor: 'oklch(0.1 0 0 / 0.5)',
        }}
      >
        <svg
          className="w-5 h-5"
          style={{ color: 'oklch(0.8 0.15 60)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold text-white"
            style={{
              backgroundColor: 'oklch(0.6 0.2 20)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}
      </button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-12 w-80 max-h-96 overflow-hidden rounded-2xl border-2 backdrop-blur-xl z-50"
            style={{
              backgroundColor: 'oklch(0.15 0 0 / 0.95)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b-2" style={{ borderColor: 'oklch(0.7 0.15 180 / 0.3)' }}>
              <h3 className="text-lg font-bold text-white">Notifications</h3>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-gray-400">No notifications</p>
                </div>
              ) : (
                notifications.map((notification, index) => {
                  const unread = isUnread(notification, index);
                  return (
                    <motion.div
                      key={`${notification.timestamp}-${index}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => handleNotificationClick(index, notification)}
                      className={`p-4 border-b cursor-pointer transition-all ${
                        unread ? 'opacity-100' : 'opacity-70'
                      }`}
                      style={{
                        borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        backgroundColor: unread ? 'oklch(0.2 0 0 / 0.5)' : 'transparent',
                      }}
                      whileHover={{ backgroundColor: 'oklch(0.2 0 0 / 0.7)' }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl"
                          style={{
                            backgroundColor: getNotificationColor(notification.type) + '20',
                          }}
                        >
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-white">{notification.title}</h4>
                            {unread && (
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0 mt-1"
                                style={{ backgroundColor: getNotificationColor(notification.type) }}
                              />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatTimeAgo(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

