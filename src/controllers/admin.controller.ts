import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { z } from 'zod';
import { getSocketIOInstance, emitNotification } from '../config/socket';

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
        },
      });

      if (!kyc) {
        res.status(404).json({
          success: false,
          message: 'Individual KYC not found',
        });
        return;
      }

      res.json({
        success: true,
        data: kyc,
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

      res.json({
        success: true,
        data: kyc,
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
 * Get all pending KYC applications (Individual + Industrial)
 */
export const getAllPendingKYCs = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Admin access required',
    });
    return;
  }

  try {
    const { page = '1', limit = '20', type } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: any = { status: 'PENDING' };

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
    console.error('Error fetching pending KYCs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pending KYCs',
      error: error.message,
    });
  }
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
    if (io && currentKYC.status !== body.status) {
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
      }

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
    if (io && currentKYC.status !== body.status) {
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
      }

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
 * Get dashboard statistics
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
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalIndividualKYCs,
      pendingIndividualKYCs,
      approvedIndividualKYCs,
      totalIndustrialKYCs,
      pendingIndustrialKYCs,
      approvedIndustrialKYCs,
      totalJobs,
      activeJobs,
      totalApplications,
      recentUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { status: 'PENDING_VERIFICATION' } }),
      prisma.individualKYC.count(),
      prisma.individualKYC.count({ where: { status: 'PENDING' } }),
      prisma.individualKYC.count({ where: { status: 'APPROVED' } }),
      prisma.industrialKYC.count(),
      prisma.industrialKYC.count({ where: { status: 'PENDING' } }),
      prisma.industrialKYC.count({ where: { status: 'APPROVED' } }),
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
          },
          industrial: {
            total: totalIndustrialKYCs,
            pending: pendingIndustrialKYCs,
            approved: approvedIndustrialKYCs,
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

