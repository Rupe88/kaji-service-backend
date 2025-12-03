/**
 * Browser Push Notification Service with Sound
 * Handles browser notifications for urgent jobs and other important events
 */

interface CustomNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  sound?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

/**
 * Play notification sound
 */
function playNotificationSound(soundType: 'urgent' | 'default' = 'default'): void {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Different sound frequencies for different notification types
    const frequencies = {
      urgent: 800, // Higher pitch for urgent
      default: 523, // C note for regular
    };

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequencies[soundType];
    oscillator.type = 'sine';

    const currentTime = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.3, currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, currentTime + 0.3);

    oscillator.start(currentTime);
    oscillator.stop(currentTime + 0.3);
  } catch (error) {
    console.warn('Could not play notification sound:', error);
  }
}

/**
 * Show browser notification with sound
 */
export async function showBrowserNotification(
  options: CustomNotificationOptions
): Promise<Notification | null> {
  // Check if browser supports notifications
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications');
    return null;
  }

  // Request permission if not granted
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    console.warn('Notification permission denied');
    return null;
  }

  // Play sound before showing notification
  const soundType = options.tag?.includes('URGENT') ? 'urgent' : 'default';
  playNotificationSound(soundType);

  // Create notification with proper browser NotificationOptions type
  const browserNotificationOptions: NotificationOptions = {
    body: options.body,
    icon: options.icon || '/favicon.ico',
    badge: options.badge || '/favicon.ico',
    tag: options.tag,
    requireInteraction: options.requireInteraction || false,
    data: options.data,
  };

  const notification = new Notification(options.title, browserNotificationOptions);

  // Handle notification click
  notification.onclick = (event) => {
    event.preventDefault();
    window.focus();
    
    // Navigate based on notification data
    if (options.data?.jobId) {
      window.location.href = `/dashboard/urgent-jobs/${options.data.jobId}`;
    } else if (options.data?.url) {
      window.location.href = options.data.url;
    }
    
    notification.close();
  };

  // Auto-close after 5 seconds (unless requireInteraction is true)
  if (!browserNotificationOptions.requireInteraction) {
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  return notification;
}

/**
 * Show urgent job notification with sound
 */
export async function showUrgentJobNotification(
  jobTitle: string,
  distance: number,
  payment: number,
  paymentType: string,
  jobId: string
): Promise<Notification | null> {
  return showBrowserNotification({
    title: '⚡ Urgent Job Near You!',
    body: `${jobTitle} is only ${distance.toFixed(1)}km away. Payment: Rs. ${payment.toLocaleString()} (${paymentType})`,
    icon: '/favicon.ico',
    tag: `URGENT_JOB_${jobId}`,
    requireInteraction: true, // Keep notification visible until user interacts
    sound: 'urgent',
    data: {
      jobId,
      type: 'URGENT_JOB_NEARBY',
    },
  });
}

/**
 * Check if notifications are supported and enabled
 */
export function isNotificationSupported(): boolean {
  return 'Notification' in window;
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

