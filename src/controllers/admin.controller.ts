import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { z } from 'zod';
import { getSocketIOInstance, emitNotification } from '../config/socket';
import { notifyUsersAboutNewJob, sendNearbyJobRecommendationsToAllUsers } from '../services/jobRecommendation.service';
import emailService from '../services/email.service';
import { fixCloudinaryUrlForPdf } from '../utils/cloudinaryUpload';

// Validation schemas
const updateKYCStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'RESUBMITTED']),
  rejectionReason: z.string().optional(),
  adminNotes: z.string().optional(),
  verifiedBy: z.string().optional(),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED']),
  reason: z.string().optional(),
});

const bulkUpdateKYCStatusSchema = z.object({
  userIds: z.array(z.string().uuid()),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'RESUBMITTED']),
  rejectionReason: z.string().optional(),
  adminNotes: z.string().optional(),
});

const updateJobVerificationSchema = z.object({
  isVerified: z.boolean(),
  adminNotes: z.string().optional(),
});

/**
 * Get full KYC details by userId and type (for admin view)
 */
export const getKYCDetails = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const { userId, type } = req.params;

    if (type === 'INDIVIDUAL') {
      const kyc = await prisma.individualKYC.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              profileImage: true,
              createdAt: true,
            },
          },
          certifications: {
            select: {
              id: true,
              title: true,
              category: true,
              certificateNumber: true,
              issuedDate: true,
              expiryDate: true,
              certificateUrl: true,
              verificationCode: true,
              isVerified: true,
            },
            orderBy: { issuedDate: 'desc' },
          },
          jobApplications: {
            select: {
              id: true,
              resumeUrl: true,
              portfolioUrl: true,
              appliedAt: true,
              status: true,
              job: {
                select: {
                  id: true,
                  title: true,
                  employer: {
                    select: {
                      companyName: true,
                    },
                  },
                },
              },
            },
            orderBy: { appliedAt: 'desc' },
            take: 50, // Limit to recent 50 applications to avoid performance issues
          },
        },
      });

      if (!kyc) {
        res.status(404).json({
          success: false,
          message: 'Individual KYC not found',
        });
        return;
      }

      // Extract documentUrls from externalCertifications if stored there
      let documentUrls: string[] = [];
      if (kyc.externalCertifications && typeof kyc.externalCertifications === 'object') {
        const extCerts = kyc.externalCertifications as any;
        if (extCerts.documentUrls && Array.isArray(extCerts.documentUrls)) {
          documentUrls = extCerts.documentUrls;
        }
      }
      // Also check if documentUrls exists as a direct property
      if ((kyc as any).documentUrls && Array.isArray((kyc as any).documentUrls)) {
        documentUrls = (kyc as any).documentUrls;
      }

      // Fix PDF URLs for all document fields, job applications, and certifications
      const fixedKyc = {
        ...kyc,
        profilePhotoUrl: kyc.profilePhotoUrl ? fixCloudinaryUrlForPdf(kyc.profilePhotoUrl) : kyc.profilePhotoUrl,
        videoKYCUrl: kyc.videoKYCUrl ? fixCloudinaryUrlForPdf(kyc.videoKYCUrl) : kyc.videoKYCUrl,
        videoIntroUrl: (kyc as any).videoIntroUrl ? fixCloudinaryUrlForPdf((kyc as any).videoIntroUrl) : (kyc as any).videoIntroUrl,
        ...(documentUrls.length > 0 && {
          documentUrls: documentUrls.map((url: string) => fixCloudinaryUrlForPdf(url)),
        }),
        // Fix URLs in job applications (resumes and portfolios)
        jobApplications: kyc.jobApplications?.map((app: any) => ({
          ...app,
          resumeUrl: app.resumeUrl ? fixCloudinaryUrlForPdf(app.resumeUrl) : app.resumeUrl,
          portfolioUrl: app.portfolioUrl ? fixCloudinaryUrlForPdf(app.portfolioUrl) : app.portfolioUrl,
        })),
        // Fix URLs in certifications
        certifications: kyc.certifications?.map((cert: any) => ({
          ...cert,
          certificateUrl: cert.certificateUrl ? fixCloudinaryUrlForPdf(cert.certificateUrl) : cert.certificateUrl,
        })),
      };

      res.json({
        success: true,
        data: fixedKyc,
      });
    } else if (type === 'INDUSTRIAL') {
      const kyc = await prisma.industrialKYC.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              profileImage: true,
              createdAt: true,
            },
          },
        },
      });

      if (!kyc) {
        res.status(404).json({
          success: false,
          message: 'Industrial KYC not found',
        });
        return;
      }

      // Fix PDF URLs for all certificate documents
      const fixedKyc = {
        ...kyc,
        registrationCertificate: kyc.registrationCertificate ? fixCloudinaryUrlForPdf(kyc.registrationCertificate) : kyc.registrationCertificate,
        taxClearanceCertificate: kyc.taxClearanceCertificate ? fixCloudinaryUrlForPdf(kyc.taxClearanceCertificate) : kyc.taxClearanceCertificate,
        panCertificate: kyc.panCertificate ? fixCloudinaryUrlForPdf(kyc.panCertificate) : kyc.panCertificate,
        vatCertificate: kyc.vatCertificate ? fixCloudinaryUrlForPdf(kyc.vatCertificate) : kyc.vatCertificate,
      };

      res.json({
        success: true,
        data: fixedKyc,
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Invalid KYC type. Must be INDIVIDUAL or INDUSTRIAL',
      });
    }
  } catch (error: any) {
    console.error('Error fetching KYC details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYC details',
      error: error.message,
    });
  }
};

/**
 * Get all KYC applications (Individual + Industrial) with optional status filter
 */
export const getAllKYCs = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const { page = '1', limit = '20', type, status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    // Allow filtering by status (PENDING, APPROVED, REJECTED, RESUBMITTED) or show all if not specified
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const [individualKYCs, industrialKYCs, individualTotal, industrialTotal] = await Promise.all([
      type !== 'INDUSTRIAL'
        ? prisma.individualKYC.findMany({
            where,
            skip,
            take,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  profileImage: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      type !== 'INDIVIDUAL'
        ? prisma.industrialKYC.findMany({
            where,
            skip,
            take,
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                  phone: true,
                  profileImage: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          })
        : [],
      type !== 'INDUSTRIAL' ? prisma.individualKYC.count({ where }) : 0,
      type !== 'INDIVIDUAL' ? prisma.industrialKYC.count({ where }) : 0,
    ]);

    res.json({
      success: true,
      data: {
        individual: individualKYCs,
        industrial: industrialKYCs,
      },
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: individualTotal + industrialTotal,
        individualTotal,
        industrialTotal,
        pages: Math.ceil((individualTotal + industrialTotal) / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching KYCs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch KYCs',
      error: error.message,
    });
  }
};

/**
 * Get all pending KYC applications (Individual + Industrial) - Legacy endpoint for backward compatibility
 */
export const getAllPendingKYCs = async (req: AuthRequest, res: Response) => {
  // Redirect to getAllKYCs with status=PENDING
  req.query.status = 'PENDING';
  return getAllKYCs(req, res);
};

/**
 * Update Individual KYC status
 */
export const updateIndividualKYCStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const { userId } = req.params;
    const body = updateKYCStatusSchema.parse(req.body);

    // Get current KYC to check if status is changing
    const currentKYC = await prisma.individualKYC.findUnique({
      where: { userId },
      select: { status: true },
    });

    if (!currentKYC) {
      res.status(404).json({
        success: false,
        message: 'Individual KYC not found',
      });
      return;
    }

    const kyc = await prisma.individualKYC.update({
      where: { userId },
      data: {
        status: body.status,
        rejectionReason: body.rejectionReason,
        adminNotes: body.adminNotes,
        verifiedBy: body.verifiedBy || req.user.id,
        verifiedAt: body.status === 'APPROVED' ? new Date() : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update user status if KYC is approved
    if (body.status === 'APPROVED') {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    }

    // Emit notification if status changed
    const io = getSocketIOInstance();
    if (io) {
      // Always send notification if status is different, or if explicitly approved/rejected
      const statusChanged = currentKYC.status !== body.status;
      
      if (statusChanged) {
        let title = 'KYC Status Updated';
        let message = `Your Individual KYC has been ${body.status}`;

        if (body.status === 'APPROVED') {
          title = 'KYC Approved! 🎉';
          message = 'Congratulations! Your Individual KYC has been approved. You can now access all features.';
        } else if (body.status === 'REJECTED') {
          title = 'KYC Rejected';
          message = body.rejectionReason
            ? `Your Individual KYC was rejected: ${body.rejectionReason}`
            : 'Your Individual KYC was rejected. Please review and resubmit.';
        } else if (body.status === 'RESUBMITTED') {
          title = 'KYC Resubmitted';
          message = 'Your Individual KYC has been resubmitted and is under review.';
        }

        console.log(`📬 Sending KYC status notification to user ${userId}: ${body.status}`);
        emitNotification(io, userId, {
          type: 'KYC_STATUS',
          title,
          message,
          data: {
            kycType: 'INDIVIDUAL',
            status: body.status,
            rejectionReason: body.rejectionReason || undefined,
            verifiedAt: kyc.verifiedAt?.toISOString(),
          },
        });

        // Send email notification (async, don't wait)
        if (kyc.user?.email) {
          emailService.sendKYCStatusEmail(
            {
              email: kyc.user.email,
              firstName: kyc.user.firstName || undefined,
            },
            {
              kycType: 'INDIVIDUAL',
              status: body.status,
              rejectionReason: body.rejectionReason || undefined,
            }
          ).catch((error) => {
            console.error('Error sending KYC status email:', error);
          });
        }
      } else {
        console.log(`⏭️  KYC status unchanged (${currentKYC.status}), skipping notification`);
      }
    } else {
      console.warn('⚠️  Socket.io instance not available, notification not sent');
    }

    res.json({
      success: true,
      data: kyc,
    });
  } catch (error: any) {
    console.error('Error updating Individual KYC status:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update KYC status',
      error: error.message,
    });
  }
};

/**
 * Update Industrial KYC status
 */
export const updateIndustrialKYCStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const { userId } = req.params;
    const body = updateKYCStatusSchema.parse(req.body);

    // Get current KYC to check if status is changing
    const currentKYC = await prisma.industrialKYC.findUnique({
      where: { userId },
      select: { status: true },
    });

    if (!currentKYC) {
      res.status(404).json({
        success: false,
        message: 'Industrial KYC not found',
      });
      return;
    }

    const kyc = await prisma.industrialKYC.update({
      where: { userId },
      data: {
        status: body.status,
        rejectionReason: body.rejectionReason,
        adminNotes: body.adminNotes,
        verifiedBy: body.verifiedBy || req.user.id,
        verifiedAt: body.status === 'APPROVED' ? new Date() : undefined,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Update user status if KYC is approved
    if (body.status === 'APPROVED') {
      await prisma.user.update({
        where: { id: userId },
        data: { status: 'ACTIVE' },
      });
    }

    // Emit notification if status changed
    const io = getSocketIOInstance();
    if (io) {
      // Always send notification if status is different, or if explicitly approved/rejected
      const statusChanged = currentKYC.status !== body.status;
      
      if (statusChanged) {
        let title = 'KYC Status Updated';
        let message = `Your Industrial KYC has been ${body.status}`;

        if (body.status === 'APPROVED') {
          title = 'KYC Approved! 🎉';
          message = 'Congratulations! Your Industrial KYC has been approved. You can now post jobs.';
        } else if (body.status === 'REJECTED') {
          title = 'KYC Rejected';
          message = body.rejectionReason
            ? `Your Industrial KYC was rejected: ${body.rejectionReason}`
            : 'Your Industrial KYC was rejected. Please review and resubmit.';
        } else if (body.status === 'RESUBMITTED') {
          title = 'KYC Resubmitted';
          message = 'Your Industrial KYC has been resubmitted and is under review.';
        }

        console.log(`📬 Sending KYC status notification to user ${userId}: ${body.status}`);
        emitNotification(io, userId, {
          type: 'KYC_STATUS',
          title,
          message,
          data: {
            kycType: 'INDUSTRIAL',
            status: body.status,
            rejectionReason: body.rejectionReason || undefined,
            verifiedAt: kyc.verifiedAt?.toISOString(),
          },
        });

        // Send email notification (async, don't wait)
        if (kyc.user?.email) {
          emailService.sendKYCStatusEmail(
            {
              email: kyc.user.email,
              firstName: kyc.user.firstName || undefined,
            },
            {
              kycType: 'INDUSTRIAL',
              status: body.status,
              rejectionReason: body.rejectionReason || undefined,
            }
          ).catch((error) => {
            console.error('Error sending KYC status email:', error);
          });
        }
      } else {
        console.log(`⏭️  KYC status unchanged (${currentKYC.status}), skipping notification`);
      }
    } else {
      console.warn('⚠️  Socket.io instance not available, notification not sent');
    }

    res.json({
      success: true,
      data: kyc,
    });
  } catch (error: any) {
    console.error('Error updating Industrial KYC status:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update KYC status',
      error: error.message,
    });
  }
};

/**
 * Get all users with pagination and filters
 */
export const getAllUsers = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const { page = '1', limit = '20', role, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          status: true,
          isEmailVerified: true,
          profileImage: true,
          createdAt: true,
          updatedAt: true,
          lastLoginAt: true,
          individualKYC: {
            select: {
              status: true,
              fullName: true,
            },
          },
          industrialKYC: {
            select: {
              status: true,
              companyName: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message,
    });
  }
};

/**
 * Update user status
 */
export const updateUserStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const { userId } = req.params;
    const body = updateUserStatusSchema.parse(req.body);

    // Prevent admin from deleting themselves
    if (userId === req.user.id && body.status === 'DELETED') {
      res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        status: body.status,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Emit notification if user is suspended
    if (body.status === 'SUSPENDED') {
      const io = getSocketIOInstance();
      if (io) {
        emitNotification(io, userId, {
          type: 'ACCOUNT_STATUS',
          title: 'Account Suspended',
          message: body.reason
            ? `Your account has been suspended: ${body.reason}`
            : 'Your account has been suspended. Please contact support.',
          data: {
            status: body.status,
            reason: body.reason || undefined,
          },
        });
      }
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update user status',
      error: error.message,
    });
  }
};

/**
 * Get dashboard statistics with chart data
 */
export const getAdminDashboardStats = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    // Get last 30 days for time-series data
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);
    
    // Get all data for the last 30 days in parallel
    const [usersData, jobsData, applicationsData] = await Promise.all([
      prisma.user.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),
      prisma.jobPosting.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { createdAt: true },
      }),
      prisma.jobApplication.findMany({
        where: {
          appliedAt: { gte: thirtyDaysAgo },
        },
        select: { appliedAt: true },
      }),
    ]);

    // Generate date labels and count data for last 30 days
    const dateMap = new Map<string, { users: number; jobs: number; applications: number }>();
    
    // Initialize all dates with 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateKey = date.toISOString().split('T')[0];
      dateMap.set(dateKey, { users: 0, jobs: 0, applications: 0 });
    }

    // Count users by date
    usersData.forEach((user) => {
      const dateKey = new Date(user.createdAt).toISOString().split('T')[0];
      const existing = dateMap.get(dateKey);
      if (existing) {
        existing.users++;
      }
    });

    // Count jobs by date
    jobsData.forEach((job) => {
      const dateKey = new Date(job.createdAt).toISOString().split('T')[0];
      const existing = dateMap.get(dateKey);
      if (existing) {
        existing.jobs++;
      }
    });

    // Count applications by date
    applicationsData.forEach((app) => {
      const dateKey = new Date(app.appliedAt).toISOString().split('T')[0];
      const existing = dateMap.get(dateKey);
      if (existing) {
        existing.applications++;
      }
    });

    // Convert to array format
    const chartData = Array.from(dateMap.entries()).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalIndividualKYCs,
      pendingIndividualKYCs,
      approvedIndividualKYCs,
      rejectedIndividualKYCs,
      totalIndustrialKYCs,
      pendingIndustrialKYCs,
      approvedIndustrialKYCs,
      rejectedIndustrialKYCs,
      totalJobs,
      activeJobs,
      totalApplications,
      recentUsers,
      usersByRole,
      applicationsByStatus,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.individualKYC.count(),
      prisma.individualKYC.count({ where: { status: 'PENDING' } }),
      prisma.individualKYC.count({ where: { status: 'APPROVED' } }),
      prisma.individualKYC.count({ where: { status: 'REJECTED' } }),
      prisma.industrialKYC.count(),
      prisma.industrialKYC.count({ where: { status: 'PENDING' } }),
      prisma.industrialKYC.count({ where: { status: 'APPROVED' } }),
      prisma.industrialKYC.count({ where: { status: 'REJECTED' } }),
      prisma.jobPosting.count(),
      prisma.jobPosting.count({ where: { isActive: true } }),
      prisma.jobApplication.count(),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.jobApplication.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          active: activeUsers,
          pending: pendingUsers,
        },
        kyc: {
          individual: {
            total: totalIndividualKYCs,
            pending: pendingIndividualKYCs,
            approved: approvedIndividualKYCs,
            rejected: rejectedIndividualKYCs,
          },
          industrial: {
            total: totalIndustrialKYCs,
            pending: pendingIndustrialKYCs,
            approved: approvedIndustrialKYCs,
            rejected: rejectedIndustrialKYCs,
          },
        },
        jobs: {
          total: totalJobs,
          active: activeJobs,
        },
        applications: {
          total: totalApplications,
        },
        recentUsers,
        // Chart data
        charts: {
          timeSeries: chartData,
          usersByRole: usersByRole.map((u) => ({
            role: u.role,
            count: u._count.id,
          })),
          kycStatus: {
            individual: {
              approved: approvedIndividualKYCs,
              pending: pendingIndividualKYCs,
              rejected: rejectedIndividualKYCs,
            },
            industrial: {
              approved: approvedIndustrialKYCs,
              pending: pendingIndustrialKYCs,
              rejected: rejectedIndustrialKYCs,
            },
          },
          applicationsByStatus: applicationsByStatus.map((a) => ({
            status: a.status,
            count: a._count.id,
          })),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching admin dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
      error: error.message,
    });
  }
};

/**
 * Bulk update KYC status
 */
export const bulkUpdateKYCStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const body = bulkUpdateKYCStatusSchema.parse(req.body);

    const result = await prisma.$transaction(async (tx) => {
      const updateData: any = {
        status: body.status,
        rejectionReason: body.rejectionReason,
        adminNotes: body.adminNotes,
        verifiedBy: req.user!.id,
      };

      if (body.status === 'APPROVED') {
        updateData.verifiedAt = new Date();
      }

      const [individual, industrial] = await Promise.all([
        tx.individualKYC.updateMany({
          where: { userId: { in: body.userIds } },
          data: updateData,
        }),
        tx.industrialKYC.updateMany({
          where: { userId: { in: body.userIds } },
          data: updateData,
        }),
      ]);

      // Update user statuses if approved
      if (body.status === 'APPROVED') {
        await tx.user.updateMany({
          where: { id: { in: body.userIds } },
          data: { status: 'ACTIVE' },
        });
      }

      return {
        individual: individual.count,
        industrial: industrial.count,
        total: individual.count + industrial.count,
      };
    });

    // Emit notifications
    const io = getSocketIOInstance();
    if (io) {
      for (const userId of body.userIds) {
        let title = 'KYC Status Updated';
        let message = `Your KYC has been ${body.status}`;

        if (body.status === 'APPROVED') {
          title = 'KYC Approved! 🎉';
          message = 'Congratulations! Your KYC has been approved.';
        } else if (body.status === 'REJECTED') {
          title = 'KYC Rejected';
          message = body.rejectionReason
            ? `Your KYC was rejected: ${body.rejectionReason}`
            : 'Your KYC was rejected. Please review and resubmit.';
        }

        emitNotification(io, userId, {
          type: 'KYC_STATUS',
          title,
          message,
          data: {
            status: body.status,
            rejectionReason: body.rejectionReason || undefined,
          },
        });
      }
    }

    res.json({
      success: true,
      message: `Updated status for ${result.total} KYC profile(s)`,
      data: result,
    });
  } catch (error: any) {
    console.error('Error bulk updating KYC status:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors,
      });
      return;
    }
    res.status(500).json({
      success: false,
      message: 'Failed to bulk update KYC status',
      error: error.message,
    });
  }
};

/**
 * Get all unverified jobs (for admin to review)
 */
export const getUnverifiedJobs = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { page = '1', limit = '20', status } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = {
      isVerified: status === 'verified' ? true : status === 'unverified' ? false : undefined,
    };

    // If no status filter, show unverified jobs by default
    if (!status) {
      where.isVerified = false;
    }

    const [jobs, total] = await Promise.all([
      prisma.jobPosting.findMany({
        where,
        skip,
        take,
        include: {
          employer: {
            select: {
              companyName: true,
              industrySector: true,
              province: true,
              district: true,
              status: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.jobPosting.count({ where }),
    ]);

    return res.json({
      success: true,
      data: jobs,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    });
  } catch (error: any) {
    console.error('Error fetching unverified jobs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unverified jobs',
      error: error.message,
    });
  }
};

/**
 * Update job verification status
 */
export const updateJobVerification = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const { jobId } = req.params;
    const body = updateJobVerificationSchema.parse(req.body);

    // Get current job to check if verification status is changing
    const currentJob = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            userId: true,
            companyName: true,
          },
        },
      },
    });

    if (!currentJob) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
      });
    }

    const wasVerified = currentJob.isVerified;
    const isNowVerified = body.isVerified;

    const job = await prisma.jobPosting.update({
      where: { id: jobId },
      data: {
        isVerified: body.isVerified,
        verifiedBy: body.isVerified ? req.user.id : null,
      },
      include: {
        employer: {
          select: {
            userId: true,
            companyName: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    // Emit notification if verification status changed
    const io = getSocketIOInstance();
    if (io && currentJob.employer && currentJob.isVerified !== job.isVerified) {
      const title = job.isVerified
        ? 'Job Posting Verified! 🎉'
        : 'Job Posting Verification Removed';
      const message = job.isVerified
        ? `Your job posting "${job.title}" has been verified and is now visible to all users.`
        : `Your job posting "${job.title}" verification has been removed.`;

      emitNotification(io, currentJob.employer.userId, {
        type: 'JOB_VERIFICATION',
        title,
        message,
        data: {
          jobId: job.id,
          jobTitle: job.title,
          isVerified: job.isVerified,
        },
      });
    }

    // If job was just verified and is active, notify matching users
    if (!wasVerified && isNowVerified && job.isActive) {
      // Run in background - don't wait for it
      notifyUsersAboutNewJob(job.id).catch((error) => {
        console.error('Error notifying users about verified job:', error);
      });

      // Also send nearby job recommendations if job has location
      if (job.latitude && job.longitude && !job.isRemote) {
        sendNearbyJobRecommendationsToAllUsers(30, 40).catch((error) => {
          console.error('Error sending nearby job recommendations:', error);
        });
      }
    }

    return res.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    console.error('Error updating job verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update job verification',
      error: error.message,
    });
  }
};

/**
 * Bulk update job verification status
 */
export const bulkUpdateJobVerification = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  try {
    const body = z.object({
      jobIds: z.array(z.string().uuid()),
      isVerified: z.boolean(),
    }).parse(req.body);

    const result = await prisma.jobPosting.updateMany({
      where: { id: { in: body.jobIds } },
      data: {
        isVerified: body.isVerified,
        verifiedBy: body.isVerified ? req.user.id : null,
      },
    });

    // Emit notifications for each job
    const io = getSocketIOInstance();
    if (io && result.count > 0) {
      const jobs = await prisma.jobPosting.findMany({
        where: { id: { in: body.jobIds } },
        include: {
          employer: {
            select: {
              userId: true,
            },
          },
        },
      });

      for (const job of jobs) {
        if (job.employer) {
          const title = body.isVerified
            ? 'Job Posting Verified! 🎉'
            : 'Job Posting Verification Removed';
          const message = body.isVerified
            ? `Your job posting "${job.title}" has been verified and is now visible to all users.`
            : `Your job posting "${job.title}" verification has been removed.`;

          emitNotification(io, job.employer.userId, {
            type: 'JOB_VERIFICATION',
            title,
            message,
            data: {
              jobId: job.id,
              jobTitle: job.title,
              isVerified: body.isVerified,
            },
          });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        updated: result.count,
      },
    });
  } catch (error: any) {
    console.error('Error bulk updating job verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to bulk update job verification',
      error: error.message,
    });
  }
};

