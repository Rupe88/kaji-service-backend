'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { API_URL } from '@/lib/constants';
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
  markAsRead: (index: number) => void;
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

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
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
      setNotifications(prev => [data, ...prev]);
      
      // Show toast notification
      toast.success(data.message, {
        duration: 5000,
        icon: getNotificationIcon(data.type),
      });
    });

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
  const markAsRead = (index: number) => {
    if (notifications[index]) {
      const notificationId = notifications[index].timestamp + notifications[index].type;
      setReadNotifications(prev => new Set([...prev, notificationId]));
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
    case 'JOB_VERIFICATION':
      return '✓';
    default:
      return '🔔';
  }
};

