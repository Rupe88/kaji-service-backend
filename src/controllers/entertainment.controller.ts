import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { getSocketIOInstance, emitNotification } from '../config/socket';

const prisma = new PrismaClient();

const createEntertainmentServiceSchema = z.object({
  serviceId: z.string().uuid().optional(),
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  entertainmentType: z.string().min(2), // DJ, MUSICIAN, PERFORMER, COMEDIAN, etc.
  eventTypes: z.array(z.string()).optional(),
  pricing: z.record(z.any()).optional(),
  availability: z.record(z.any()).optional(),
  portfolioUrls: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
  images: z.array(z.string().url()).optional(),
  socialLinks: z.record(z.string().url()).optional(),
});

export class EntertainmentController {
  /**
   * Create entertainment service
   */
  async createEntertainmentService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createEntertainmentServiceSchema.parse(req.body);

      // Check if user is entertainer
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isEntertainer: true },
      });

      if (!user?.isEntertainer) {
        return res.status(403).json({
          success: false,
          message: 'Only entertainers can create entertainment services',
        });
      }

      const entertainmentService = await prisma.entertainmentService.create({
        data: {
          providerId: userId!,
          serviceId: body.serviceId,
          ...body,
        },
        include: {
          provider: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Entertainment service created successfully',
        data: entertainmentService,
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
   * Get entertainment services
   */
  async getEntertainmentServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { entertainmentType, page = '1', limit = '20' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {
        isActive: true,
      };

      if (entertainmentType) {
        where.entertainmentType = entertainmentType as string;
      }

      const [services, total] = await Promise.all([
        prisma.entertainmentService.findMany({
          where,
          include: {
            provider: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          skip,
          take,
          orderBy: { totalBookings: 'desc' },
        }),
        prisma.entertainmentService.count({ where }),
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
   * Get entertainment service by ID
   */
  async getEntertainmentServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const service = await prisma.entertainmentService.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Entertainment service not found',
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
   * Update entertainment service
   */
  async updateEntertainmentService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const body = createEntertainmentServiceSchema.partial().parse(req.body);

      // Check ownership
      const existingService = await prisma.entertainmentService.findUnique({
        where: { id },
        select: { providerId: true },
      });

      if (!existingService) {
        return res.status(404).json({
          success: false,
          message: 'Entertainment service not found',
        });
      }

      if (existingService.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own entertainment services',
        });
      }

      const updatedService = await prisma.entertainmentService.update({
        where: { id },
        data: body,
        include: {
          provider: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        message: 'Entertainment service updated successfully',
        data: updatedService,
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
   * Delete entertainment service
   */
  async deleteEntertainmentService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // Check ownership
      const existingService = await prisma.entertainmentService.findUnique({
        where: { id },
        select: { providerId: true },
      });

      if (!existingService) {
        return res.status(404).json({
          success: false,
          message: 'Entertainment service not found',
        });
      }

      if (existingService.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own entertainment services',
        });
      }

      await prisma.entertainmentService.update({
        where: { id },
        data: { isActive: false },
      });

      return res.json({
        success: true,
        message: 'Entertainment service deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Book entertainment service
   */
  async bookEntertainmentService(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const body = z.object({
        eventDate: z.string().datetime(),
        eventTime: z.string().optional(),
        location: z.string().min(5),
        agreedPrice: z.number().min(0),
      }).parse(req.body);

      const service = await prisma.entertainmentService.findUnique({
        where: { id },
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Entertainment service not found',
        });
      }

      const booking = await (prisma as any).entertainmentBooking.create({
        data: {
          entertainmentServiceId: id,
          customerId: userId!,
          eventDate: new Date(body.eventDate),
          eventTime: body.eventTime,
          location: body.location,
          agreedPrice: body.agreedPrice,
        } as any,
      });

      // Notify provider
      const io = getSocketIOInstance();
      if (io && service) {
        await emitNotification(io, service.providerId, {
          type: 'ENTERTAINMENT_BOOKING',
          title: 'New Entertainment Booking',
          message: `You have a new booking request for "${service.title}" on ${new Date(body.eventDate).toLocaleDateString()}.`,
          data: { bookingId: (booking as any).id, serviceId: service.id },
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Booking request sent successfully',
        data: booking,
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
}

export const entertainmentController = new EntertainmentController();

