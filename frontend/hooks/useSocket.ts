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
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp: string;
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
            type: notif.type,
            title: notif.title,
            message: notif.message,
            data: notif.data,
            timestamp: notif.createdAt || new Date().toISOString(),
          }));
          
          setNotifications(historyNotifications);
          
          // Mark read notifications
          const readSet = new Set<string>();
          response.data.forEach((notif: any) => {
            if (notif.isRead) {
              const notificationId = (notif.createdAt || new Date().toISOString()) + notif.type;
              readSet.add(notificationId);
            }
          });
          setReadNotifications(readSet);
        }
      } catch (error) {
        console.error('Error loading notification history:', error);
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
    newSocket.on('notification', (data: NotificationData) => {
      console.log('📬 Notification received:', data);
      // Check if notification already exists (avoid duplicates)
      setNotifications(prev => {
        const exists = prev.some(n => 
          n.timestamp === data.timestamp && n.type === data.type
        );
        if (exists) return prev;
        return [data, ...prev];
      });
      
      // Show toast notification
      toast.success(data.message, {
        duration: 5000,
        icon: getNotificationIcon(data.type),
      });
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
    const notificationId = notification.timestamp + notification.type;
    
    // Update local state immediately
    setReadNotifications(prev => new Set([...prev, notificationId]));
    
    // Try to sync with backend (if we have the notification ID from database)
    // Note: We'll need to store the database ID when loading from history
    // For now, we'll just update local state
    try {
      // If notification has an id field (from database), mark it as read
      // This will be handled when we update the notification history page
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    setReadNotifications(new Set());
  };

  // Calculate unread count
  const unreadCount = notifications.filter((notif, index) => {
    const notificationId = notif.timestamp + notif.type;
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

