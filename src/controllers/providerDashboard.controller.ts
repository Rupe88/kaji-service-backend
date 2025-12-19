import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class ProviderDashboardController {
  /**
   * Get provider dashboard overview
   */
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'Unauthorized',
        });
      }

      const [
        totalServices,
        activeServices,
        pendingServices,
        totalBookings,
        activeBookings,
        completedBookings,
        totalRevenue,
        averageRating,
        recentBookings,
        recentServices,
      ] = await Promise.all([
        prisma.service.count({
          where: { providerId: userId },
        }),
        prisma.service.count({
          where: { providerId: userId, status: 'APPROVED', isActive: true },
        }),
        prisma.service.count({
          where: { providerId: userId, status: 'PENDING' },
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId: userId },
          },
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId: userId },
            status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
          },
        }),
        prisma.serviceBooking.count({
          where: {
            service: { providerId: userId },
            status: 'COMPLETED',
          },
        }),
        prisma.serviceBooking.aggregate({
          where: {
            service: { providerId: userId },
            status: 'COMPLETED',
            paymentStatus: 'PAID',
          },
          _sum: {
            agreedPrice: true,
          },
        }),
        prisma.service.aggregate({
          where: { providerId: userId },
          _avg: {
            averageRating: true,
          },
        }),
        prisma.serviceBooking.findMany({
          where: {
            service: { providerId: userId },
          },
          include: {
            service: {
              select: {
                title: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            customer: {
              select: {
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.service.findMany({
          where: { providerId: userId },
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
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
      ]);

      return res.json({
        success: true,
        data: {
          overview: {
            totalServices,
            activeServices,
            pendingServices,
            totalBookings,
            activeBookings,
            completedBookings,
            totalRevenue: totalRevenue._sum.agreedPrice || 0,
            averageRating: averageRating._avg.averageRating || 0,
          },
          recentBookings,
          recentServices,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get services with filters
   */
  async getServices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const {
        categoryId,
        subcategoryId,
        status,
        isActive,
        page = '1',
        limit = '20',
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {
        providerId: userId,
      };

      if (categoryId) where.categoryId = categoryId as string;
      if (subcategoryId) where.subcategoryId = subcategoryId as string;
      if (status) where.status = status as string;
      if (isActive !== undefined) where.isActive = isActive === 'true';

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
            _count: {
              select: {
                bookings: true,
                reviews: true,
              },
            },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
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
   * Get Service Hunt Report Radar data
   */
  async getServiceHuntRadar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        categoryId,
        subcategoryId,
        province,
        district,
        demographics,
        geographics,
        standards,
      } = req.query;

      // Get services in the same category/subcategory
      const where: any = {
        status: 'APPROVED',
        isActive: true,
      };

      if (categoryId) where.categoryId = categoryId as string;
      if (subcategoryId) where.subcategoryId = subcategoryId as string;
      if (province) where.province = province as string;
      if (district) where.district = district as string;

      const services = await prisma.service.findMany({
        where,
        select: {
          id: true,
          title: true,
          latitude: true,
          longitude: true,
          province: true,
          district: true,
          city: true,
          demographics: true,
          geographics: true,
          standards: true,
          bookingCount: true,
          averageRating: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        take: 1000, // Limit for performance
      });

      // Filter by demographics/geographics/standards if provided
      let filteredServices = services;
      if (demographics || geographics || standards) {
        filteredServices = services.filter((service) => {
          if (demographics && service.demographics) {
            const serviceDemographics = service.demographics as any;
            const filterDemographics = JSON.parse(demographics as string);
            // Simple matching logic
            for (const key in filterDemographics) {
              if (serviceDemographics[key] !== filterDemographics[key]) {
                return false;
              }
            }
          }
          if (geographics && service.geographics) {
            const serviceGeographics = service.geographics as any;
            const filterGeographics = JSON.parse(geographics as string);
            for (const key in filterGeographics) {
              if (serviceGeographics[key] !== filterGeographics[key]) {
                return false;
              }
            }
          }
          if (standards && service.standards) {
            const serviceStandards = service.standards as any;
            const filterStandards = JSON.parse(standards as string);
            for (const key in filterStandards) {
              if (serviceStandards[key] !== filterStandards[key]) {
                return false;
              }
            }
          }
          return true;
        });
      }

      // Generate radar data points
      const radarData = filteredServices.map((service) => ({
        id: service.id,
        title: service.title,
        location: {
          latitude: service.latitude,
          longitude: service.longitude,
          province: service.province,
          district: service.district,
          city: service.city,
        },
        metrics: {
          bookingCount: service.bookingCount,
          averageRating: service.averageRating || 0,
        },
        category: service.category.name,
        demographics: service.demographics,
        geographics: service.geographics,
        standards: service.standards,
      }));

      return res.json({
        success: true,
        data: {
          radarData,
          totalPoints: radarData.length,
          filters: {
            categoryId,
            subcategoryId,
            province,
            district,
            demographics,
            geographics,
            standards,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get ongoing service status
   */
  async getOngoingServices(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;

      const ongoingBookings = await prisma.serviceBooking.findMany({
        where: {
          service: { providerId: userId },
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
        include: {
          service: {
            select: {
              title: true,
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          customer: {
            select: {
              fullName: true,
              phone: true,
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
      });

      const servicePerformance = await prisma.service.findMany({
        where: {
          providerId: userId,
          status: 'APPROVED',
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          bookingCount: true,
          completionCount: true,
          averageRating: true,
          customerSatisfactionScore: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { bookingCount: 'desc' },
        take: 20,
      });

      return res.json({
        success: true,
        data: {
          ongoingBookings,
          servicePerformance,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const providerDashboardController = new ProviderDashboardController();

