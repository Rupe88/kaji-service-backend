import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { updateServiceSchema } from '../types/service.types';

const prisma = new PrismaClient();

export class AdminServiceController {
  /**
   * Get all services with comprehensive filters (Admin only)
   */
  async getAllServices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        categoryId,
        subcategoryId,
        status,
        providerId,
        province,
        district,
        minRating,
        minBookings,
        affiliateProgram,
        page = '1',
        limit = '20',
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {};

      if (categoryId) where.categoryId = categoryId as string;
      if (subcategoryId) where.subcategoryId = subcategoryId as string;
      if (status) where.status = status as string;
      if (providerId) where.providerId = providerId as string;
      if (province) where.province = province as string;
      if (district) where.district = district as string;
      if (minRating) where.averageRating = { gte: Number(minRating) };
      if (minBookings) where.bookingCount = { gte: Number(minBookings) };
      if (affiliateProgram !== undefined) where.affiliateProgram = affiliateProgram === 'true';

      const orderBy: any = {};
      if (sortBy === 'rating') {
        orderBy.averageRating = sortOrder;
      } else if (sortBy === 'bookings') {
        orderBy.bookingCount = sortOrder;
      } else if (sortBy === 'views') {
        orderBy.viewCount = sortOrder;
      } else {
        orderBy.createdAt = sortOrder;
      }

      const [services, total] = await Promise.all([
        prisma.service.findMany({
          where,
          include: {
            category: {
              select: {
                name: true,
              },
            },
            subcategory: {
              select: {
                name: true,
              },
            },
            provider: {
              select: {
                companyName: true,
                userId: true,
              },
            },
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
          skip,
          take,
          orderBy,
        }),
        prisma.service.count({ where }),
      ]);

      return res.json({
        success: true,
        data: services,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get service by ID (Admin view)
   */
  async getServiceById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const service = await prisma.service.findUnique({
        where: { id },
        include: {
          category: true,
          subcategory: true,
          provider: {
            include: {
              user: {
                select: {
                  email: true,
                  phone: true,
                },
              },
            },
          },
          bookings: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              customer: {
                select: {
                  fullName: true,
                },
              },
            },
          },
          reviews: {
            take: 10,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found',
        });
      }

      return res.json({
        success: true,
        data: service,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update service (Admin can edit any service)
   */
  async updateService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const body = updateServiceSchema.parse(req.body);

      const service = await prisma.service.update({
        where: { id },
        data: {
          ...body,
          availableFrom: body.availableFrom ? new Date(body.availableFrom) : undefined,
          availableTo: body.availableTo ? new Date(body.availableTo) : undefined,
        },
        include: {
          category: true,
          subcategory: true,
          provider: {
            select: {
              companyName: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        message: 'Service updated successfully',
        data: service,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Validation error',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Delete service (Admin only)
   */
  async deleteService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Check if service has bookings
      const service = await prisma.service.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              bookings: true,
            },
          },
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found',
        });
      }

      if (service._count.bookings > 0) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete service with existing bookings. Deactivate it instead.',
        });
      }

      await prisma.service.delete({
        where: { id },
      });

      return res.json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Bulk update services (Admin only)
   */
  async bulkUpdateServices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { serviceIds, action, data } = req.body;

      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'serviceIds must be a non-empty array',
        });
      }

      let updateData: any = {};

      if (action === 'approve') {
        updateData = { status: 'APPROVED', verifiedAt: new Date(), verifiedBy: req.user?.id };
      } else if (action === 'reject') {
        updateData = { status: 'REJECTED', verifiedBy: req.user?.id };
      } else if (action === 'suspend') {
        updateData = { status: 'SUSPENDED', isActive: false };
      } else if (action === 'activate') {
        updateData = { status: 'APPROVED', isActive: true };
      } else if (action === 'custom' && data) {
        updateData = data;
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use: approve, reject, suspend, activate, or custom',
        });
      }

      const result = await prisma.service.updateMany({
        where: {
          id: { in: serviceIds },
        },
        data: updateData,
      });

      return res.json({
        success: true,
        message: `Updated ${result.count} service(s)`,
        data: {
          updated: result.count,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const adminServiceController = new AdminServiceController();

