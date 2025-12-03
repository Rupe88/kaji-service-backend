'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { API_URL } from '@/lib/constants';
import { notificationApi } from '@/lib/api-client';
import toast from 'react-hot-toast';

interface CoinUpdateData {
  balance: string;
  coinsAwarded: number;
  source: string;
  description: string;
  transactionId?: string;
}

export interface NotificationData {
  id?: string; // Database ID
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  isRead?: boolean; // Read status from database
  readAt?: string; // When it was read
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  coinUpdate: CoinUpdateData | null;
  notifications: NotificationData[];
  unreadCount: number;
  readNotifications: Set<string>;
  markAsRead: (index: number) => Promise<void>;
  clearNotifications: () => void;
}

/**
 * Socket.io hook for real-time updates
 * Automatically connects when user is authenticated
 */
export const useSocket = (): UseSocketReturn => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [coinUpdate, setCoinUpdate] = useState<CoinUpdateData | null>(null);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);

  // Load notification history from database on mount
  useEffect(() => {
    const loadNotificationHistory = async () => {
      if (!isAuthenticated || !user?.id) return;

      try {
        const response = await notificationApi.getNotifications({ page: 1, limit: 50 });
        if (response.data && Array.isArray(response.data)) {
          // Convert database notifications to NotificationData format
          const historyNotifications: NotificationData[] = response.data.map((notif: any) => ({
            id: notif.id, // Database ID
            type: notif.type,
            title: notif.title,
            message: notif.message,
            data: notif.data,
            timestamp: notif.createdAt || new Date().toISOString(),
            isRead: notif.isRead || false,
            readAt: notif.readAt,
          }));
          
          setNotifications(historyNotifications);
          
          // Mark read notifications using database IDs
          const readSet = new Set<string>();
          response.data.forEach((notif: any) => {
            if (notif.isRead && notif.id) {
              readSet.add(notif.id);
            }
          });
          setReadNotifications(readSet);
        }
      } catch (error: any) {
        // Only log if it's not a 404 (which might be expected if no notifications exist)
        if (error?.response?.status !== 404) {
          console.error('Error loading notification history:', error);
        }
        // Continue even if history load fails
      }
    };

    if (isAuthenticated && user?.id) {
      loadNotificationHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      // Clear notifications on logout
      setNotifications([]);
      setReadNotifications(new Set());
      return;
    }

    // Create socket connection using the same API URL as the REST API
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
      auth: {
        // Token will be sent via cookies automatically
      },
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket.io connected');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Socket.io disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      setIsConnected(false);
    });

    // Listen for coin updates
    newSocket.on('coin:update', (data: CoinUpdateData) => {
      console.log('💰 Coin update received:', data);
      setCoinUpdate(data);
      
      // Clear the update after 5 seconds (for UI animations)
      setTimeout(() => {
        setCoinUpdate(null);
      }, 5000);
    });

    // Listen for notifications
    newSocket.on('notification', async (data: NotificationData) => {
      console.log('📬 Notification received:', data);
      // Check if notification already exists (avoid duplicates)
      // Use ID if available, otherwise use timestamp + type
      setNotifications(prev => {
        const exists = prev.some(n => {
          if (data.id && n.id) {
            return n.id === data.id;
          }
          return n.timestamp === data.timestamp && n.type === data.type;
        });
        if (exists) return prev;
        return [{ ...data, isRead: false }, ...prev];
      });
      
      // Show toast notification
      toast.success(data.message, {
        duration: 5000,
        icon: getNotificationIcon(data.type),
      });

      // Show browser push notification with sound for urgent jobs
      if (data.type === 'URGENT_JOB_NEARBY' && data.data) {
        try {
          const { showUrgentJobNotification } = await import('@/utils/browserNotifications');
          await showUrgentJobNotification(
            data.data.jobTitle || data.title,
            data.data.distance || 0,
            data.data.paymentAmount || 0,
            data.data.paymentType || 'CASH',
            data.data.jobId || ''
          );
        } catch (error) {
          console.error('Error showing browser notification:', error);
        }
      } else {
        // Show regular browser notification for other types
        try {
          const { showBrowserNotification } = await import('@/utils/browserNotifications');
          await showBrowserNotification({
            title: data.title,
            body: data.message,
            tag: data.type,
            data: data.data,
            requireInteraction: data.type.includes('URGENT') || data.type.includes('CRITICAL'),
          });
        } catch (error) {
          console.error('Error showing browser notification:', error);
        }
      }
    });

    // Note: Notifications are now persisted in database, so we don't need to cleanup
    // The database will handle retention policies

    // Ping/pong for keep-alive
    const pingInterval = setInterval(() => {
      if (newSocket.connected) {
        newSocket.emit('ping');
      }
    }, 30000); // Every 30 seconds

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Cleanup
    return () => {
      clearInterval(pingInterval);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // Only depend on isAuthenticated and user.id, not the entire user object
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  // Mark notification as read
  const markAsRead = async (index: number) => {
    if (!notifications[index]) return;
    
    const notification = notifications[index];
    const notificationId = notification.id || (notification.timestamp + notification.type);
    
    // Update local state immediately
    setReadNotifications(prev => new Set([...prev, notificationId]));
    
    // Update notification in state to reflect read status
    setNotifications(prev => prev.map(notif => {
      const notifId = notif.id || (notif.timestamp + notif.type);
      if (notifId === notificationId) {
        return { ...notif, isRead: true, readAt: new Date().toISOString() };
      }
      return notif;
    }));
    
    // Sync with backend if we have a database ID
    if (notification.id) {
      try {
        await notificationApi.markAsRead(notification.id);
      } catch (error) {
        console.error('Error marking notification as read:', error);
        // Revert local state on error
        setReadNotifications(prev => {
          const newSet = new Set(prev);
          newSet.delete(notificationId);
          return newSet;
        });
        setNotifications(prev => prev.map(notif => {
          const notifId = notif.id || (notif.timestamp + notif.type);
          if (notifId === notificationId) {
            return { ...notif, isRead: false, readAt: undefined };
          }
          return notif;
        }));
      }
    }
  };

  // Clear all notifications
  const clearNotifications = async () => {
    try {
      await notificationApi.deleteAllNotifications();
      setNotifications([]);
      setReadNotifications(new Set());
      toast.success('All notifications cleared!');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      toast.error('Failed to clear all notifications.');
    }
  };

  // Calculate unread count - use database isRead status if available, otherwise use readNotifications set
  const unreadCount = notifications.filter((notif) => {
    if (notif.isRead !== undefined) {
      return !notif.isRead;
    }
    const notificationId = notif.id || (notif.timestamp + notif.type);
    return !readNotifications.has(notificationId);
  }).length;

  return {
    socket,
    isConnected,
    coinUpdate,
    notifications,
    unreadCount,
    readNotifications,
    markAsRead,
    clearNotifications,
  };
};

// Helper function to get notification icon
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
    case 'JOB_RECOMMENDATION':
      return '🎯';
    case 'NEARBY_JOB_RECOMMENDATION':
      return '📍';
    case 'EXAM_BOOKING':
      return '📝';
    case 'EVENT_REGISTRATION':
      return '🎉';
    case 'CERTIFICATION_CREATED':
      return '🏆';
    case 'TRAINING_ENROLLMENT':
      return '🎓';
    case 'TRAINING_COMPLETION':
      return '🎉';
    case 'EXAM_RESULT':
      return '📝';
    default:
      return '🔔';
  }
};

