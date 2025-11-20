import { Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

// Notification Preferences Schema
export const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  jobAlerts: z.boolean().optional(),
  applicationUpdates: z.boolean().optional(),
  kycUpdates: z.boolean().optional(),
});

// Privacy Settings Schema
export const privacySettingsSchema = z.object({
  profileVisibility: z
    .enum(['public', 'private', 'connections'], {
      errorMap: () => ({
        message: 'Profile visibility must be public, private, or connections',
      }),
    })
    .optional(),
  showEmail: z.boolean().optional(),
  showPhone: z.boolean().optional(),
});

// Type definitions for better type safety
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
export type PrivacySettings = z.infer<typeof privacySettingsSchema>;

/**
 * Get user notification preferences
 */
export const getNotificationPreferences = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        emailNotifications: true,
        pushNotifications: true,
        jobAlerts: true,
        applicationUpdates: true,
        kycUpdates: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        jobAlerts: user.jobAlerts,
        applicationUpdates: user.applicationUpdates,
        kycUpdates: user.kycUpdates,
      },
    });
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notification preferences',
    });
  }
};

/**
 * Update user notification preferences
 */
export const updateNotificationPreferences = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const body = notificationPreferencesSchema.parse(req.body);

    // Build update data object (only include fields that are provided)
    const updateData: {
      emailNotifications?: boolean;
      pushNotifications?: boolean;
      jobAlerts?: boolean;
      applicationUpdates?: boolean;
      kycUpdates?: boolean;
    } = {};

    if (body.emailNotifications !== undefined) {
      updateData.emailNotifications = body.emailNotifications;
    }
    if (body.pushNotifications !== undefined) {
      updateData.pushNotifications = body.pushNotifications;
    }
    if (body.jobAlerts !== undefined) {
      updateData.jobAlerts = body.jobAlerts;
    }
    if (body.applicationUpdates !== undefined) {
      updateData.applicationUpdates = body.applicationUpdates;
    }
    if (body.kycUpdates !== undefined) {
      updateData.kycUpdates = body.kycUpdates;
    }

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
      return;
    }

    // Update user preferences
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        emailNotifications: true,
        pushNotifications: true,
        jobAlerts: true,
        applicationUpdates: true,
        kycUpdates: true,
      },
    });

    res.json({
      success: true,
      message: 'Notification preferences updated successfully',
      data: {
        emailNotifications: user.emailNotifications,
        pushNotifications: user.pushNotifications,
        jobAlerts: user.jobAlerts,
        applicationUpdates: user.applicationUpdates,
        kycUpdates: user.kycUpdates,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message:
        error.message || 'Failed to update notification preferences',
    });
  }
};

/**
 * Get user privacy settings
 */
export const getPrivacySettings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        profileVisibility: true,
        showEmail: true,
        showPhone: true,
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        profileVisibility: user.profileVisibility,
        showEmail: user.showEmail,
        showPhone: user.showPhone,
      },
    });
  } catch (error: any) {
    console.error('Error fetching privacy settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch privacy settings',
    });
  }
};

/**
 * Update user privacy settings
 */
export const updatePrivacySettings = async (
  req: AuthRequest,
  res: Response
) => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  try {
    const body = privacySettingsSchema.parse(req.body);

    // Build update data object (only include fields that are provided)
    const updateData: {
      profileVisibility?: string;
      showEmail?: boolean;
      showPhone?: boolean;
    } = {};

    if (body.profileVisibility !== undefined) {
      updateData.profileVisibility = body.profileVisibility;
    }
    if (body.showEmail !== undefined) {
      updateData.showEmail = body.showEmail;
    }
    if (body.showPhone !== undefined) {
      updateData.showPhone = body.showPhone;
    }

    // If no fields to update, return error
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No fields to update',
      });
      return;
    }

    // Update user privacy settings
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        profileVisibility: true,
        showEmail: true,
        showPhone: true,
      },
    });

    res.json({
      success: true,
      message: 'Privacy settings updated successfully',
      data: {
        profileVisibility: user.profileVisibility,
        showEmail: user.showEmail,
        showPhone: user.showPhone,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    console.error('Error updating privacy settings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update privacy settings',
    });
  }
};

