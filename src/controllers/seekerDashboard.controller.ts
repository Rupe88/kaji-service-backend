import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class SeekerDashboardController {
  /**
   * Get seeker dashboard overview
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
        totalDemands,
        openDemands,
        totalBookings,
        activeBookings,
        completedBookings,
        totalSpent,
        recentDemands,
        recentBookings,
      ] = await Promise.all([
        prisma.serviceDemand.count({
          where: { seekerId: userId },
        }),
        prisma.serviceDemand.count({
          where: { seekerId: userId, status: 'OPEN' },
        }),
        prisma.serviceBooking.count({
          where: { customerId: userId },
        }),
        prisma.serviceBooking.count({
          where: {
            customerId: userId,
            status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
          },
        }),
        prisma.serviceBooking.count({
          where: {
            customerId: userId,
            status: 'COMPLETED',
          },
        }),
        prisma.serviceBooking.aggregate({
          where: {
            customerId: userId,
            status: 'COMPLETED',
            paymentStatus: 'PAID',
          },
          _sum: {
            agreedPrice: true,
          },
        }),
        prisma.serviceDemand.findMany({
          where: { seekerId: userId },
          include: {
            category: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                responses: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        }),
        prisma.serviceBooking.findMany({
          where: { customerId: userId },
          include: {
            service: {
              select: {
                title: true,
                provider: {
                  select: {
                    companyName: true,
                  },
                },
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
            totalDemands,
            openDemands,
            totalBookings,
            activeBookings,
            completedBookings,
            totalSpent: totalSpent._sum.agreedPrice || 0,
          },
          recentDemands,
          recentBookings,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get service demands with filters
   */
  async getDemands(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const {
        categoryId,
        subcategoryId,
        status,
        page = '1',
        limit = '20',
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {
        seekerId: userId,
      };

      if (categoryId) where.categoryId = categoryId as string;
      if (subcategoryId) where.subcategoryId = subcategoryId as string;
      if (status) where.status = status as string;

      const [demands, total] = await Promise.all([
        prisma.serviceDemand.findMany({
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
                responses: true,
              },
            },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.serviceDemand.count({ where }),
      ]);

      return res.json({
        success: true,
        data: demands,
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
   * Get Demand Response Radar data
   */
  async getDemandResponseRadar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const {
        categoryId,
        subcategoryId,
        province,
        district,
        budgetMin,
        budgetMax,
      } = req.query;

      const where: any = {
        status: 'OPEN',
      };

      if (categoryId) where.categoryId = categoryId as string;
      if (subcategoryId) where.subcategoryId = subcategoryId as string;
      if (province) where.province = province as string;
      if (district) where.district = district as string;
      if (budgetMin || budgetMax) {
        where.OR = [];
        if (budgetMin) {
          where.OR.push({
            budgetMax: { gte: Number(budgetMin) },
          });
        }
        if (budgetMax) {
          where.OR.push({
            budgetMin: { lte: Number(budgetMax) },
          });
        }
      }

      const demands = await prisma.serviceDemand.findMany({
        where,
        select: {
          id: true,
          title: true,
          latitude: true,
          longitude: true,
          province: true,
          district: true,
          city: true,
          budgetMin: true,
          budgetMax: true,
          responseCount: true,
          viewCount: true,
          urgency: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        take: 1000, // Limit for performance
      });

      // Generate radar data points
      const radarData = demands.map((demand) => ({
        id: demand.id,
        title: demand.title,
        location: {
          latitude: demand.latitude,
          longitude: demand.longitude,
          province: demand.province,
          district: demand.district,
          city: demand.city,
        },
        metrics: {
          responseCount: demand.responseCount,
          viewCount: demand.viewCount,
          budgetRange: {
            min: demand.budgetMin,
            max: demand.budgetMax,
          },
        },
        urgency: demand.urgency,
        category: demand.category.name,
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
            budgetMin,
            budgetMax,
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
          customerId: userId,
          status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        },
        include: {
          service: {
            select: {
              title: true,
              provider: {
                select: {
                  companyName: true,
                  companyPhone: true,
                },
              },
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { scheduledDate: 'asc' },
      });

      const serviceHistory = await prisma.serviceBooking.findMany({
        where: {
          customerId: userId,
          status: 'COMPLETED',
        },
        include: {
          service: {
            select: {
              title: true,
              provider: {
                select: {
                  companyName: true,
                },
              },
            },
          },
          review: {
            select: {
              rating: true,
              review: true,
            },
          },
        },
        orderBy: { completedAt: 'desc' },
        take: 20,
      });

      return res.json({
        success: true,
        data: {
          ongoingBookings,
          serviceHistory,
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const seekerDashboardController = new SeekerDashboardController();

