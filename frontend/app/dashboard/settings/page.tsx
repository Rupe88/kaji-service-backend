'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import { UrgentJobPreferences } from '@/components/settings/UrgentJobPreferences';

function SettingsContent() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'account' | 'security' | 'notifications' | 'privacy'>('account');
  
  // Account settings
  const [accountData, setAccountData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  });

  // Security settings
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    jobAlerts: true,
    applicationUpdates: true,
    kycUpdates: true,
  });

  // Privacy settings
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
  });

  useEffect(() => {
    if (user) {
      setAccountData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Fetch notification preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.USERS.PREFERENCES);
        if (response.data.success && response.data.data) {
          setNotifications(response.data.data);
        }
      } catch (error) {
        // Silently fail - will use defaults
        console.error('Failed to fetch notification preferences:', error);
      }
    };

    fetchPreferences();
  }, []);

  // Fetch privacy settings on mount
  useEffect(() => {
    const fetchPrivacy = async () => {
      try {
        const response = await api.get(API_ENDPOINTS.USERS.PRIVACY);
        if (response.data.success && response.data.data) {
          setPrivacy(response.data.data);
        }
      } catch (error) {
        // Silently fail - will use defaults
        console.error('Failed to fetch privacy settings:', error);
      }
    };

    fetchPrivacy();
  }, []);

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.patch(API_ENDPOINTS.AUTH.UPDATE_PROFILE, {
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        phone: accountData.phone,
      });

      if (response.data.success) {
        toast.success('Profile updated successfully!');
        await refreshUser();
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      });

      if (response.data.success) {
        toast.success('Password changed successfully!');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        toast.error(response.data.message || 'Failed to change password');
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to change password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.patch(API_ENDPOINTS.USERS.PREFERENCES, notifications);

      if (response.data.success) {
        toast.success('Notification preferences updated!');
        // Update local state with response data if provided
        if (response.data.data) {
          setNotifications(response.data.data);
        }
      } else {
        toast.error(response.data.message || 'Failed to update notification preferences');
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to update notification preferences');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePrivacyUpdate = async () => {
    setLoading(true);
    try {
      const response = await api.patch(API_ENDPOINTS.USERS.PRIVACY, privacy);

      if (response.data.success) {
        toast.success('Privacy settings updated!');
        // Update local state with response data if provided
        if (response.data.data) {
          setPrivacy(response.data.data);
        }
      } else {
        toast.error(response.data.message || 'Failed to update privacy settings');
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to update privacy settings');
      }
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'security', label: 'Security', icon: '🔒' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔐' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Tabs */}
          <div className="lg:col-span-1">
            <div className="p-4 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              <nav className="space-y-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-teal-500/20 to-purple-500/20 border border-teal-500/30'
                        : 'hover:bg-gray-800/30'
                    }`}
                  >
                    <span className="text-xl">{tab.icon}</span>
                    <span className={`font-medium ${activeTab === tab.id ? 'text-white' : 'text-gray-300'}`}>
                      {tab.label}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-6 rounded-2xl border-2 backdrop-blur-xl"
              style={{
                backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                borderColor: 'oklch(0.7 0.15 180 / 0.3)',
              }}
            >
              {/* Account Settings */}
              {activeTab === 'account' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Account Information</h2>
                  <form onSubmit={handleAccountUpdate} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Input
                        label="First Name"
                        type="text"
                        value={accountData.firstName}
                        onChange={(e) => setAccountData({ ...accountData, firstName: e.target.value })}
                      />
                      <Input
                        label="Last Name"
                        type="text"
                        value={accountData.lastName}
                        onChange={(e) => setAccountData({ ...accountData, lastName: e.target.value })}
                      />
                    </div>
                    <Input
                      label="Email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="opacity-60"
                    />
                    <Input
                      label="Phone Number"
                      type="tel"
                      value={accountData.phone}
                      onChange={(e) => setAccountData({ ...accountData, phone: e.target.value })}
                    />
                    <div className="pt-4">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Security</h2>
                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <Input
                      label="Current Password"
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      required
                    />
                    <Input
                      label="New Password"
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      required
                    />
                    <Input
                      label="Confirm New Password"
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      required
                    />
                    <div className="pt-4">
                      <Button
                        type="submit"
                        variant="primary"
                        size="md"
                        disabled={loading}
                      >
                        {loading ? 'Changing...' : 'Change Password'}
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Notification Preferences</h2>
                  
                  {/* Browser Push Notifications with Sound */}
                  <div className="p-5 rounded-xl border-2 backdrop-blur-xl mb-6" style={{
                    backgroundColor: 'oklch(0.12 0 0 / 0.7)',
                    borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                  }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-white font-semibold text-lg">🔔 Browser Push Notifications</h3>
                          {typeof window !== 'undefined' && 'Notification' in window && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              Notification.permission === 'granted' 
                                ? 'bg-green-500/20 text-green-400' 
                                : Notification.permission === 'denied'
                                ? 'bg-red-500/20 text-red-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {Notification.permission === 'granted' ? 'Enabled' : 
                               Notification.permission === 'denied' ? 'Blocked' : 'Not Set'}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-3">
                          Enable browser notifications with sound alerts for urgent jobs posted within your preferred radius. 
                          Notifications are sent via SendGrid email and browser push notifications with sound.
                        </p>
                        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' && (
                          <p className="text-green-400 text-xs flex items-center gap-1">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Browser notifications enabled with sound
                          </p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant={typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' ? 'outline' : 'primary'}
                        size="sm"
                        onClick={async () => {
                          try {
                            const { requestNotificationPermission } = await import('@/utils/browserNotifications');
                            const granted = await requestNotificationPermission();
                            if (granted) {
                              toast.success('Browser notifications enabled! You will receive notifications with sound for urgent jobs.');
                            } else {
                              toast.error('Notification permission denied. Please enable it in your browser settings.');
                            }
                          } catch (error) {
                            console.error('Error requesting notification permission:', error);
                            toast.error('Failed to enable browser notifications');
                          }
                        }}
                        disabled={typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted'}
                      >
                        {typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted' 
                          ? 'Enabled' 
                          : 'Enable Notifications'}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {Object.entries(notifications).map(([key, value]) => (
                      <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-gray-800/50">
                        <div>
                          <h3 className="text-white font-medium capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </h3>
                          <p className="text-gray-400 text-sm">
                            {key === 'emailNotifications' && 'Receive notifications via email (SendGrid)'}
                            {key === 'pushNotifications' && 'Receive push notifications'}
                            {key === 'jobAlerts' && 'Get alerts for new job postings'}
                            {key === 'applicationUpdates' && 'Get updates on your job applications'}
                            {key === 'kycUpdates' && 'Get updates on your KYC status'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={value}
                            onChange={(e) => {
                              setNotifications({ ...notifications, [key]: e.target.checked });
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    ))}
                    <div className="pt-4">
                      <Button
                        type="button"
                        onClick={handleNotificationUpdate}
                        variant="primary"
                        size="md"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Preferences'}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Urgent Job Notification Preferences */}
                  <div className="mt-8 pt-8 border-t border-gray-800/50">
                    <UrgentJobPreferences />
                  </div>
                </div>
              )}

              {/* Privacy Settings */}
              {activeTab === 'privacy' && (
                <div>
                  <h2 className="text-2xl font-bold text-white mb-6">Privacy Settings</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-white font-medium mb-2">Profile Visibility</label>
                      <select
                        value={privacy.profileVisibility}
                        onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:border-transparent transition-all duration-300 backdrop-blur-sm border-2"
                        style={{
                          backgroundColor: 'oklch(0.1 0 0 / 0.8)',
                          borderColor: 'oklch(0.7 0.15 180 / 0.2)',
                        }}
                      >
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                        <option value="connections">Connections Only</option>
                      </select>
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800/50">
                        <div>
                          <h3 className="text-white font-medium">Show Email</h3>
                          <p className="text-gray-400 text-sm">Allow others to see your email address</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.showEmail}
                            onChange={(e) => setPrivacy({ ...privacy, showEmail: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-800/50">
                        <div>
                          <h3 className="text-white font-medium">Show Phone</h3>
                          <p className="text-gray-400 text-sm">Allow others to see your phone number</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={privacy.showPhone}
                            onChange={(e) => setPrivacy({ ...privacy, showPhone: e.target.checked })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                        </label>
                      </div>
                    </div>
                    <div className="pt-4">
                      <Button
                        onClick={handlePrivacyUpdate}
                        variant="primary"
                        size="md"
                        disabled={loading}
                      >
                        {loading ? 'Saving...' : 'Save Privacy Settings'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

