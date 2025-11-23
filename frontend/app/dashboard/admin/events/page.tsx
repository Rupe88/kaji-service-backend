'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { eventsApi } from '@/lib/api-client';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import Link from 'next/link';
import type { Event, EventType } from '@/types/api';

function EventsManagementContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedType, setSelectedType] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'JOB_FAIR' as EventType,
    mode: 'ONLINE' as 'PHYSICAL' | 'ONLINE' | 'HYBRID',
    isFree: true,
    price: '',
    eventDate: '',
    duration: 60,
    meetingLink: '',
    venue: '',
    maxAttendees: '',
    isActive: true,
  });

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (selectedType) {
        params.type = selectedType;
      }

      const response = await eventsApi.list(params);
      
      if (response.data) {
        setEvents(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(prev => ({ ...prev, ...response.pagination }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, selectedType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = async () => {
    try {
      if (!formData.title || !formData.description || !formData.eventDate) {
        toast.error('Please fill in all required fields');
        return;
      }

      const eventData: any = {
        organizerId: user?.id || '',
        title: formData.title,
        description: formData.description,
        type: formData.type,
        mode: formData.mode,
        isFree: formData.isFree,
        eventDate: new Date(formData.eventDate).toISOString(),
        duration: formData.duration,
        isActive: formData.isActive,
      };

      if (!formData.isFree && formData.price) {
        eventData.price = parseFloat(formData.price);
      }

      if (formData.mode === 'ONLINE' || formData.mode === 'HYBRID') {
        if (!formData.meetingLink) {
          toast.error('Meeting link is required for online/hybrid events');
          return;
        }
        eventData.meetingLink = formData.meetingLink;
      }

      if (formData.mode === 'PHYSICAL' || formData.mode === 'HYBRID') {
        if (!formData.venue) {
          toast.error('Venue is required for physical/hybrid events');
          return;
        }
        eventData.venue = formData.venue;
      }

      if (formData.maxAttendees) {
        eventData.maxAttendees = parseInt(formData.maxAttendees);
      }

      if (editingEvent) {
        // Update existing event - we'll need to add update endpoint
        await eventsApi.update(editingEvent.id, eventData);
        toast.success('Event updated successfully!');
      } else {
        // Create new event
        await eventsApi.create(eventData);
        toast.success('Event created successfully!');
      }

      setShowCreateModal(false);
      setEditingEvent(null);
      setFormData({
        title: '',
        description: '',
        type: 'JOB_FAIR',
        mode: 'ONLINE',
        isFree: true,
        price: '',
        eventDate: '',
        duration: 60,
        meetingLink: '',
        venue: '',
        maxAttendees: '',
        isActive: true,
      });
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save event');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    const eventDate = event.eventDate ? new Date(event.eventDate).toISOString().slice(0, 16) : '';
    setFormData({
      title: event.title,
      description: event.description,
      type: event.type,
      mode: event.mode,
      isFree: event.isFree,
      price: typeof event.price === 'string' ? event.price : (event.price?.toString() || ''),
      eventDate: eventDate,
      duration: event.duration,
      meetingLink: event.meetingLink || '',
      venue: event.venue || '',
      maxAttendees: event.maxAttendees?.toString() || '',
      isActive: event.isActive,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      await eventsApi.delete(eventId);
      toast.success('Event deleted successfully!');
      fetchEvents();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete event');
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

  if (loading && events.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-400 mb-4"></div>
            <div className="text-white text-lg">Loading events...</div>
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
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Event Management</h1>
              <p className="text-gray-400">Create and manage platform events</p>
            </div>
            <button
              onClick={() => {
                setEditingEvent(null);
                setFormData({
                  title: '',
                  description: '',
                  type: 'JOB_FAIR',
                  mode: 'ONLINE',
                  isFree: true,
                  price: '',
                  eventDate: '',
                  duration: 60,
                  meetingLink: '',
                  venue: '',
                  maxAttendees: '',
                  isActive: true,
                });
                setShowCreateModal(true);
              }}
              className="px-6 py-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Event
            </button>
          </div>

          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPagination(prev => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
            >
              <option value="">All Types</option>
              <option value="JOB_FAIR">Job Fair</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="NETWORKING">Networking</option>
              <option value="SEMINAR">Seminar</option>
            </select>
          </div>

          {/* Events List */}
          {events.length === 0 ? (
            <div className="text-center py-16">
              <svg className="w-24 h-24 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-400 text-lg mb-2">No events found</p>
              <p className="text-gray-500 text-sm mb-4">Create your first event to get started</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
              >
                Create Event
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {events.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-6 rounded-2xl border-2 backdrop-blur-xl"
                    style={{
                      backgroundColor: 'oklch(0.1 0 0 / 0.6)',
                      borderColor: event.isActive 
                        ? 'oklch(0.7 0.15 180 / 0.3)' 
                        : 'oklch(0.5 0 0 / 0.3)',
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-xl font-bold text-white">{event.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            event.isActive 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {event.isActive ? 'Active' : 'Inactive'}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400">
                            {event.type.replace('_', ' ')}
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-400">
                            {event.mode}
                          </span>
                          {event.isFree ? (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400">
                              Free
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400">
                              ${typeof event.price === 'string' ? parseFloat(event.price) : event.price || 0}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{event.description}</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400 mb-1">Event Date</p>
                            <p className="text-white font-semibold">{formatDate(event.eventDate)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Duration</p>
                            <p className="text-white font-semibold">{event.duration} min</p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Registrations</p>
                            <p className="text-white font-semibold">
                              {event.registeredCount || event._count?.registrations || 0}
                              {event.maxAttendees && ` / ${event.maxAttendees}`}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400 mb-1">Location</p>
                            <p className="text-white font-semibold">
                              {event.mode === 'ONLINE' ? 'Online' : event.venue || 'TBD'}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <Link href={`/dashboard/admin/events/${event.id}/registrations`}>
                          <button className="px-4 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 font-semibold transition-colors text-sm whitespace-nowrap">
                            View Registrations
                          </button>
                        </Link>
                        <button
                          onClick={() => handleEdit(event)}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-semibold transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(event.id)}
                          className="px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold transition-colors text-sm"
                        >
                          Delete
                        </button>
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl p-6 rounded-2xl border-2 backdrop-blur-xl max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'oklch(0.1 0 0 / 0.9)',
              borderColor: 'oklch(0.7 0.15 180 / 0.3)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {editingEvent ? 'Edit Event' : 'Create New Event'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEvent(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  placeholder="e.g., Tech Job Fair 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  placeholder="Describe the event..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Event Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as EventType })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="JOB_FAIR">Job Fair</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="NETWORKING">Networking</option>
                    <option value="SEMINAR">Seminar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Mode *</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value as 'PHYSICAL' | 'ONLINE' | 'HYBRID' })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  >
                    <option value="ONLINE">Online</option>
                    <option value="PHYSICAL">Physical</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Event Date & Time *</label>
                  <input
                    type="datetime-local"
                    value={formData.eventDate}
                    onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Duration (minutes) *</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                    min="1"
                    max="1440"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              </div>

              {(formData.mode === 'ONLINE' || formData.mode === 'HYBRID') && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Meeting Link *</label>
                  <input
                    type="url"
                    value={formData.meetingLink}
                    onChange={(e) => setFormData({ ...formData, meetingLink: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                    placeholder="https://meet.google.com/..."
                  />
                </div>
              )}

              {(formData.mode === 'PHYSICAL' || formData.mode === 'HYBRID') && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Venue *</label>
                  <input
                    type="text"
                    value={formData.venue}
                    onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                    placeholder="Event venue address"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Max Attendees (optional)</label>
                <input
                  type="number"
                  value={formData.maxAttendees}
                  onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
                  min="1"
                  className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  placeholder="Leave empty for unlimited"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isFree"
                  checked={formData.isFree}
                  onChange={(e) => setFormData({ ...formData, isFree: e.target.checked, price: e.target.checked ? '' : formData.price })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-teal-400 focus:ring-teal-400"
                />
                <label htmlFor="isFree" className="text-sm text-gray-400">
                  Free Event
                </label>
              </div>

              {!formData.isFree && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    min="0"
                    className="w-full px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white focus:outline-none focus:border-teal-400"
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-teal-400 focus:ring-teal-400"
                />
                <label htmlFor="isActive" className="text-sm text-gray-400">
                  Active (visible to users)
                </label>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingEvent(null);
                }}
                className="px-6 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-white hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                className="px-6 py-2 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-400 font-semibold transition-colors"
              >
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default function EventsManagementPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <EventsManagementContent />
    </ProtectedRoute>
  );
}

