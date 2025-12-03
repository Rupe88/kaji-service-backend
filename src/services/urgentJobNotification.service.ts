/**
 * Urgent Job Notification Service
 * Notifies users within 10km radius when an urgent job is posted
 */

import prisma from '../config/database';
import { getSocketIOInstance, emitNotification } from '../config/socket';
import emailService from './email.service';
import { calculateDistance, getBoundingBox, isValidCoordinates } from './location.service';

interface UrgentJobData {
  id: string;
  title: string;
  description: string;
  category: string;
  paymentAmount: number;
  paymentType: string;
  urgencyLevel: string;
  latitude: number | null;
  longitude: number | null;
  province: string;
  district: string;
  city: string;
  ward?: string | null;
  street?: string | null;
  startTime: Date;
  contactPhone?: string | null;
  posterId: string;
  poster?: {
    firstName?: string | null;
    lastName?: string | null;
  } | null;
}

/**
 * Find users within 10km radius and notify them about an urgent job
 * @param urgentJob The urgent job that was just created
 * @returns Number of users notified
 */
export async function notifyNearbyUsersAboutUrgentJob(
  urgentJob: UrgentJobData
): Promise<{ notifiedCount: number; emailCount: number; socketCount: number }> {
  // Check if job has valid coordinates
  if (
    !urgentJob.latitude ||
    !urgentJob.longitude ||
    !isValidCoordinates(urgentJob.latitude, urgentJob.longitude)
  ) {
    console.log('⚠️  Urgent job does not have valid coordinates, skipping notifications');
    return { notifiedCount: 0, emailCount: 0, socketCount: 0 };
  }

  // Use maximum possible radius (100km) for initial bounding box query
  // Individual user preferences will filter further
  const maxRadiusKm = 100;
  const boundingBox = getBoundingBox(
    urgentJob.latitude,
    urgentJob.longitude,
    maxRadiusKm
  );

  try {
    // Find all users with KYC that have location data within bounding box
    const usersWithLocation = await prisma.individualKYC.findMany({
      where: {
        AND: [
          {
            latitude: {
              gte: boundingBox.minLat,
              lte: boundingBox.maxLat,
            },
          },
          {
            longitude: {
              gte: boundingBox.minLon,
              lte: boundingBox.maxLon,
            },
          },
          {
            latitude: { not: null },
          },
          {
            longitude: { not: null },
          },
          {
            status: 'APPROVED', // Only notify approved/verified users
          },
          {
            user: {
              status: 'ACTIVE',
              // Don't notify the job poster
              id: { not: urgentJob.posterId },
            },
          },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            emailNotifications: true,
            status: true,
            urgentJobNotificationsEnabled: true,
            urgentJobMaxDistance: true,
            urgentJobMinPayment: true,
            urgentJobPreferredCategories: true,
            urgentJobQuietHoursStart: true,
            urgentJobQuietHoursEnd: true,
            urgentJobNotificationFrequency: true,
          },
        },
      },
    });

    console.log(
      `📍 Found ${usersWithLocation.length} users with location data in bounding box`
    );

    // Helper function to check if current time is within quiet hours
    const isQuietHours = (startTime: string | null, endTime: string | null): boolean => {
      if (!startTime || !endTime) return false;
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + currentMinute;
      
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startTimeMinutes = startHour * 60 + startMin;
      const endTimeMinutes = endHour * 60 + endMin;
      
      // Handle quiet hours that span midnight (e.g., 22:00 - 08:00)
      if (startTimeMinutes > endTimeMinutes) {
        return currentTimeMinutes >= startTimeMinutes || currentTimeMinutes < endTimeMinutes;
      }
      return currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;
    };

    // Calculate exact distances and filter based on user preferences
    const nearbyUsers: Array<{
      userId: string;
      email: string | null;
      firstName: string | null;
      emailNotifications: boolean;
      distance: number;
    }> = [];

    for (const kyc of usersWithLocation) {
      if (kyc.latitude === null || kyc.longitude === null) continue;
      if (!kyc.user) continue;

      const user = kyc.user;
      
      // Check if user has urgent job notifications enabled
      if (!user.urgentJobNotificationsEnabled) {
        continue;
      }

      // Check quiet hours (skip if in quiet hours and frequency is instant)
      if (user.urgentJobNotificationFrequency === 'instant' && 
          isQuietHours(user.urgentJobQuietHoursStart, user.urgentJobQuietHoursEnd)) {
        continue; // Skip notification during quiet hours for instant notifications
      }

      const distance = calculateDistance(
        urgentJob.latitude!,
        urgentJob.longitude!,
        kyc.latitude,
        kyc.longitude
      );

      // Use user's preferred max distance or default to 10km
      const userMaxDistance = user.urgentJobMaxDistance ?? 10;
      
      if (distance > userMaxDistance) {
        continue;
      }

      // Check minimum payment threshold
      if (user.urgentJobMinPayment !== null && 
          urgentJob.paymentAmount < Number(user.urgentJobMinPayment)) {
        continue;
      }

      // Check preferred categories
      if (user.urgentJobPreferredCategories && 
          Array.isArray(user.urgentJobPreferredCategories) &&
          user.urgentJobPreferredCategories.length > 0) {
        if (!user.urgentJobPreferredCategories.includes(urgentJob.category)) {
          continue;
        }
      }

      nearbyUsers.push({
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        emailNotifications: user.emailNotifications ?? true,
        distance,
      });
    }

    console.log(
      `✅ Found ${nearbyUsers.length} users matching preferences for urgent job`
    );

    if (nearbyUsers.length === 0) {
      return { notifiedCount: 0, emailCount: 0, socketCount: 0 };
    }

    // Prepare location string
    const locationParts = [
      urgentJob.city,
      urgentJob.district,
      urgentJob.province,
    ].filter(Boolean);
    const locationString = locationParts.join(', ');

    // Prepare poster name
    const posterName = urgentJob.poster
      ? `${urgentJob.poster.firstName || ''} ${urgentJob.poster.lastName || ''}`.trim()
      : undefined;

    // Get Socket.io instance
    const io = getSocketIOInstance();

    let emailCount = 0;
    let socketCount = 0;

    // Notify each nearby user
    for (const user of nearbyUsers) {
      try {
        // Send Socket.io notification (real-time)
        if (io) {
          await emitNotification(io, user.userId, {
            type: 'URGENT_JOB_NEARBY',
            title: `⚡ Urgent Job Near You!`,
            message: `${urgentJob.title} is only ${user.distance.toFixed(1)}km away. Payment: Rs. ${urgentJob.paymentAmount.toLocaleString()} (${urgentJob.paymentType})`,
            data: {
              jobId: urgentJob.id,
              jobTitle: urgentJob.title,
              category: urgentJob.category,
              paymentAmount: urgentJob.paymentAmount,
              paymentType: urgentJob.paymentType,
              urgencyLevel: urgentJob.urgencyLevel,
              location: locationString,
              distance: user.distance,
              startTime: urgentJob.startTime.toISOString(),
              contactPhone: urgentJob.contactPhone,
            },
          });
          socketCount++;
        }

        // Send email notification (if enabled)
        if (user.email && user.emailNotifications) {
          try {
            await emailService.sendUrgentJobNotificationEmail(
              {
                email: user.email,
                firstName: user.firstName,
              },
              {
                jobId: urgentJob.id,
                title: urgentJob.title,
                description: urgentJob.description,
                category: urgentJob.category,
                paymentAmount: urgentJob.paymentAmount,
                paymentType: urgentJob.paymentType,
                urgencyLevel: urgentJob.urgencyLevel,
                location: locationString,
                distance: user.distance,
                startTime: urgentJob.startTime.toISOString(),
                contactPhone: urgentJob.contactPhone || undefined,
                posterName: posterName,
              }
            );
            emailCount++;
          } catch (emailError: any) {
            console.error(
              `❌ Error sending email to ${user.email}:`,
              emailError.message
            );
            // Continue with other users even if one email fails
          }
        }
      } catch (error: any) {
        console.error(
          `❌ Error notifying user ${user.userId}:`,
          error.message
        );
        // Continue with other users even if one notification fails
      }
    }

    console.log(
      `✅ Notified ${nearbyUsers.length} users about urgent job: ${socketCount} socket notifications, ${emailCount} emails`
    );

    return {
      notifiedCount: nearbyUsers.length,
      emailCount,
      socketCount,
    };
  } catch (error: any) {
    console.error('❌ Error in notifyNearbyUsersAboutUrgentJob:', error);
    return { notifiedCount: 0, emailCount: 0, socketCount: 0 };
  }
}

