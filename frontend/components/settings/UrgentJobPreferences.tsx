'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';

const CATEGORIES = [
  { value: 'HAND_TO_HAND', label: 'Hand to Hand' },
  { value: 'CASH_TO_CASH', label: 'Cash to Cash' },
  { value: 'LABOR', label: 'Labor Work' },
  { value: 'OTHER', label: 'Other' },
];

const NOTIFICATION_FREQUENCY = [
  { value: 'instant', label: 'Instant - Get notified immediately' },
  { value: 'digest', label: 'Digest - Daily summary of jobs' },
];

interface UrgentJobPreferences {
  enabled: boolean;
  maxDistance: number | null;
  minPayment: number | null;
  preferredCategories: string[] | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  notificationFrequency: 'instant' | 'digest';
}

export function UrgentJobPreferences() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<UrgentJobPreferences>({
    enabled: true,
    maxDistance: 10,
    minPayment: null,
    preferredCategories: null,
    quietHoursStart: null,
    quietHoursEnd: null,
    notificationFrequency: 'instant',
  });

  useEffect(() => {
    const fetchPreferences = async () => {
      setLoading(true);
      try {
        const response = await api.get(API_ENDPOINTS.USERS.URGENT_JOB_PREFERENCES);
        if (response.data.success && response.data.data) {
          setPreferences({
            enabled: response.data.data.enabled ?? true,
            maxDistance: response.data.data.maxDistance ?? 10,
            minPayment: response.data.data.minPayment ?? null,
            preferredCategories: response.data.data.preferredCategories ?? null,
            quietHoursStart: response.data.data.quietHoursStart ?? null,
            quietHoursEnd: response.data.data.quietHoursEnd ?? null,
            notificationFrequency: response.data.data.notificationFrequency ?? 'instant',
          });
        }
      } catch (error: any) {
        console.error('Failed to fetch urgent job preferences:', error);
        // Use defaults on error
      } finally {
        setLoading(false);
      }
    };

    fetchPreferences();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.patch(API_ENDPOINTS.USERS.URGENT_JOB_PREFERENCES, {
        enabled: preferences.enabled,
        maxDistance: preferences.maxDistance,
        minPayment: preferences.minPayment,
        preferredCategories: preferences.preferredCategories && preferences.preferredCategories.length > 0 
          ? preferences.preferredCategories 
          : null,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        notificationFrequency: preferences.notificationFrequency,
      });

      if (response.data.success) {
        toast.success('Urgent job preferences saved!');
      } else {
        toast.error(response.data.message || 'Failed to save preferences');
      }
    } catch (error: any) {
      if (error.response?.data?.errors) {
        const errorMessages = error.response.data.errors.map((e: any) => e.message).join(', ');
        toast.error(`Validation errors: ${errorMessages}`);
      } else {
        toast.error(error.response?.data?.message || 'Failed to save preferences');
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (category: string) => {
    setPreferences((prev) => {
      const current = prev.preferredCategories || [];
      const newCategories = current.includes(category)
        ? current.filter((c) => c !== category)
        : [...current, category];
      return {
        ...prev,
        preferredCategories: newCategories.length > 0 ? newCategories : null,
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-oklch(var(--p))"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-oklch(var(--nc))">Urgent Job Notifications</h3>
          <p className="text-sm text-oklch(var(--nc) / 0.7) mt-1">
            Customize how and when you receive notifications about nearby urgent jobs
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={(e) => setPreferences((prev) => ({ ...prev, enabled: e.target.checked }))}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-oklch(var(--nc) / 0.2) peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-oklch(var(--p)) rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-oklch(var(--p))"></div>
        </label>
      </div>

      <AnimatePresence>
        {preferences.enabled && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {/* Maximum Distance */}
            <div className="bg-oklch(var(--b2)) rounded-lg p-5 border border-oklch(var(--nc) / 0.1)">
              <label className="block text-sm font-medium text-oklch(var(--nc)) mb-2">
                Maximum Distance (km)
              </label>
              <p className="text-xs text-oklch(var(--nc) / 0.6) mb-3">
                Only receive notifications for jobs within this distance
              </p>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={preferences.maxDistance || 10}
                  onChange={(e) =>
                    setPreferences((prev) => ({
                      ...prev,
                      maxDistance: parseInt(e.target.value),
                    }))
                  }
                  className="flex-1 h-2 bg-oklch(var(--nc) / 0.1) rounded-lg appearance-none cursor-pointer accent-oklch(var(--p))"
                />
                <div className="w-20">
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={preferences.maxDistance || 10}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        maxDistance: e.target.value ? parseInt(e.target.value) : null,
                      }))
                    }
                    className="text-center"
                  />
                </div>
              </div>
            </div>

            {/* Minimum Payment */}
            <div className="bg-oklch(var(--b2)) rounded-lg p-5 border border-oklch(var(--nc) / 0.1)">
              <label className="block text-sm font-medium text-oklch(var(--nc)) mb-2">
                Minimum Payment (Rs.)
              </label>
              <p className="text-xs text-oklch(var(--nc) / 0.6) mb-3">
                Only notify about jobs with payment equal to or above this amount (leave empty for no minimum)
              </p>
              <Input
                type="number"
                min="0"
                placeholder="No minimum"
                value={preferences.minPayment || ''}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    minPayment: e.target.value ? parseFloat(e.target.value) : null,
                  }))
                }
              />
            </div>

            {/* Preferred Categories */}
            <div className="bg-oklch(var(--b2)) rounded-lg p-5 border border-oklch(var(--nc) / 0.1)">
              <label className="block text-sm font-medium text-oklch(var(--nc)) mb-2">
                Preferred Categories
              </label>
              <p className="text-xs text-oklch(var(--nc) / 0.6) mb-3">
                Select categories you're interested in (leave empty to receive all categories)
              </p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIES.map((category) => {
                  const isSelected = preferences.preferredCategories?.includes(category.value) || false;
                  return (
                    <button
                      key={category.value}
                      type="button"
                      onClick={() => toggleCategory(category.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        isSelected
                          ? 'border-oklch(var(--p)) bg-oklch(var(--p) / 0.1) text-oklch(var(--p))'
                          : 'border-oklch(var(--nc) / 0.2) bg-oklch(var(--b2)) text-oklch(var(--nc) / 0.7) hover:border-oklch(var(--p) / 0.5)'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{category.label}</span>
                        {isSelected && (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quiet Hours */}
            <div className="bg-oklch(var(--b2)) rounded-lg p-5 border border-oklch(var(--nc) / 0.1)">
              <label className="block text-sm font-medium text-oklch(var(--nc)) mb-2">
                Quiet Hours
              </label>
              <p className="text-xs text-oklch(var(--nc) / 0.6) mb-3">
                Don't send instant notifications during these hours (digest notifications will still be sent)
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-oklch(var(--nc) / 0.7) mb-1">Start Time</label>
                  <Input
                    type="time"
                    value={preferences.quietHoursStart || ''}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        quietHoursStart: e.target.value || null,
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs text-oklch(var(--nc) / 0.7) mb-1">End Time</label>
                  <Input
                    type="time"
                    value={preferences.quietHoursEnd || ''}
                    onChange={(e) =>
                      setPreferences((prev) => ({
                        ...prev,
                        quietHoursEnd: e.target.value || null,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            {/* Notification Frequency */}
            <div className="bg-oklch(var(--b2)) rounded-lg p-5 border border-oklch(var(--nc) / 0.1)">
              <label className="block text-sm font-medium text-oklch(var(--nc)) mb-2">
                Notification Frequency
              </label>
              <p className="text-xs text-oklch(var(--nc) / 0.6) mb-3">
                Choose how often you want to receive notifications
              </p>
              <Select
                value={preferences.notificationFrequency}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    notificationFrequency: e.target.value as 'instant' | 'digest',
                  }))
                }
                options={NOTIFICATION_FREQUENCY}
              />
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

