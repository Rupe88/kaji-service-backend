import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '../utils/jwt';
import prisma from './database';

export interface SocketUser {
  userId: string;
  email: string;
  role: string;
}

// Store connected users by userId
const connectedUsers = new Map<string, string>(); // userId -> socketId

/**
 * Initialize Socket.io server with authentication
 */
export const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3001',
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      // Get token from handshake auth or cookies
      let token = socket.handshake.auth?.token;
      
      // If not in auth, try to get from cookies
      if (!token && socket.handshake.headers?.cookie) {
        const cookies = socket.handshake.headers.cookie.split(';');
        const accessTokenCookie = cookies.find((c: string) => 
          c.trim().startsWith('accessToken=')
        );
        if (accessTokenCookie) {
          token = accessTokenCookie.split('=')[1]?.trim();
        }
      }

      if (!token) {
        return next(new Error('Authentication required'));
      }

      // Verify token
      const payload = verifyAccessToken(token);

      // Check if user exists and is active
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        return next(new Error('User not found or inactive'));
      }

      // Attach user data to socket
      socket.data.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error: any) {
      next(new Error('Invalid or expired token'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    const user = socket.data.user as SocketUser;
    console.log(`✅ Socket.io: User ${user.email} (${user.userId}) connected`);

    // Store connection
    connectedUsers.set(user.userId, socket.id);

    // Join user's personal room for targeted updates
    socket.join(`user:${user.userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ Socket.io: User ${user.email} (${user.userId}) disconnected`);
      connectedUsers.delete(user.userId);
    });

    // Handle ping/pong for keep-alive
    socket.on('ping', () => {
      socket.emit('pong');
    });
  });

  return io;
};

/**
 * Emit coin update to a specific user
 */
export const emitCoinUpdate = (
  io: SocketIOServer,
  userId: string,
  data: {
    balance: string;
    coinsAwarded: number;
    source: string;
    description: string;
    transactionId?: string;
  }
): void => {
  io.to(`user:${userId}`).emit('coin:update', data);
  console.log(`📡 Socket.io: Emitted coin update to user ${userId}`);
};

/**
 * Notification data interface
 */
export interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
  timestamp?: string;
}

/**
 * Emit notification to a specific user
 * Use this for all real-time notifications (job applications, KYC updates, etc.)
 */
export const emitNotification = (
  io: SocketIOServer,
  userId: string,
  notification: NotificationData
): void => {
  const notificationWithTimestamp = {
    ...notification,
    timestamp: notification.timestamp || new Date().toISOString(),
  };
  
  io.to(`user:${userId}`).emit('notification', notificationWithTimestamp);
  console.log(`📬 Socket.io: Notification sent to user ${userId}: ${notification.title}`);
};

/**
 * Emit notification to all admin users
 * Use this when admins need to be notified (e.g., new KYC submission)
 */
export const emitNotificationToAllAdmins = async (
  io: SocketIOServer,
  notification: NotificationData
): Promise<void> => {
  try {
    // Get all admin users
    const admins = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    const notificationWithTimestamp = {
      ...notification,
      timestamp: notification.timestamp || new Date().toISOString(),
    };

    // Emit to all admin users
    admins.forEach((admin) => {
      io.to(`user:${admin.id}`).emit('notification', notificationWithTimestamp);
    });

    console.log(`📬 Socket.io: Notification sent to ${admins.length} admin(s): ${notification.title}`);
  } catch (error) {
    console.error('Error emitting notification to admins:', error);
  }
};

/**
 * Get Socket.io instance (for use in controllers)
 */
let socketIOInstance: SocketIOServer | null = null;

export const setSocketIOInstance = (io: SocketIOServer): void => {
  socketIOInstance = io;
};

export const getSocketIOInstance = (): SocketIOServer | null => {
  return socketIOInstance;
};

