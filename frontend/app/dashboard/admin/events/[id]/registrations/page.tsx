'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { eventsApi, exportApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface EventRegistration {
  id: string;
  eventId: string;
  userId: string;
  registeredAt: string;
  attended: boolean;
  event?: {
    id: string;
    title: string;
  };
  individual?: {
    userId: string;
    fullName: string;
    email: string;
  };
}

function EventRegistrationsContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const eventId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [exporting, setExporting] = useState(false);

  const fetchEvent = async () => {
    try {
      const eventData = await eventsApi.get(eventId);
      setEvent(eventData);
    } catch (error: any) {
      console.error('Error fetching event:', error);
      toast.error('Failed to load event details');
    }
  };

  const fetchRegistrations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await eventsApi.getRegistrations({
        eventId,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      if (response.data) {
        setRegistrations(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [eventId, pagination.page, pagination.limit]);

  useEffect(() => {
    fetchEvent();
    fetchRegistrations();
  }, [fetchRegistrations]);

  const handleExport = async () => {
    try {
      setExporting(true);
      // Export registrations as CSV
      const csvData = registrations.map(reg => ({
        'Registration ID': reg.id,
        'User ID': reg.userId,
        'Full Name': reg.individual?.fullName || 'N/A',
        'Email': reg.individual?.email || 'N/A',
        'Registered At': new Date(reg.registeredAt).toLocaleString(),
        'Attended': reg.attended ? 'Yes' : 'No',
      }));

      const headers = Object.keys(csvData[0] || {});
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header as keyof typeof row]}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-registrations-${eventId}-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Registrations exported successfully!');
    } catch (error: any) {
      toast.error('Failed to export registrations');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading && registrations.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading registrations...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Link href="/dashboard/admin/events">
              <motion.button
                whileHover={{ x: -4 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Events</span>
              </motion.button>
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-white mb-2">
                  Event Registrations
                </h1>
                <p className="text-gray-400">
                  {event?.title || 'Loading...'} - {pagination.total} registration{pagination.total !== 1 ? 's' : ''}
                </p>
              </div>
              {registrations.length > 0 && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="px-6 py-3 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </button>
              )}
            </div>
          </div>

          {/* Registrations List */}
          {registrations.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No registrations yet</p>
              <p className="text-gray-500 text-sm">Registrations will appear here when users register for this event</p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {registrations.map((registration, index) => (
                  <motion.div
                    key={registration.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: 'oklch(0.7 0.15 180 / 0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">
                            {registration.individual?.fullName || 'Unknown User'}
                          </h3>
                          {registration.attended && (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                              Attended
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Email</p>
                            <p className="text-white">{registration.individual?.email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Registered At</p>
                            <p className="text-white">{formatDate(registration.registeredAt)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">User ID</p>
                            <p className="text-white font-mono text-xs">{registration.userId}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Registration ID</p>
                            <p className="text-white font-mono text-xs">{registration.id}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page >= pagination.pages}
                className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function EventRegistrationsPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <EventRegistrationsContent />
    </ProtectedRoute>
  );
}

