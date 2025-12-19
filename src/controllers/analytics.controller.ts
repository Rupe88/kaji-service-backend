import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class AnalyticsController {
  /**
   * Get real-time statistics by category/subcategory (NEPSE-style)
   */
  async getCategoryStatistics(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, subcategoryId } = req.query;

      const where: any = {};
      if (categoryId) where.categoryId = categoryId as string;
      if (subcategoryId) where.subcategoryId = subcategoryId as string;

      // Get real-time counts
      const [totalProviders, totalSeekers, totalServices, activeServices, totalDemands, openDemands] = await Promise.all([
        // Total providers by category/subcategory
        prisma.industrialKYC.count({
          where: {
            status: 'APPROVED',
            services: categoryId ? {
              some: {
                categoryId: categoryId as string,
                ...(subcategoryId && { subcategoryId: subcategoryId as string }),
              },
            } : undefined,
          },
        }),
        // Total seekers by category/subcategory
        prisma.individualKYC.count({
          where: {
            status: 'APPROVED',
            serviceDemands: categoryId ? {
              some: {
                categoryId: categoryId as string,
                ...(subcategoryId && { subcategoryId: subcategoryId as string }),
              },
            } : undefined,
          },
        }),
        // Total services
        prisma.service.count({
          where: {
            ...where,
            status: 'APPROVED',
          },
        }),
        // Active services
        prisma.service.count({
          where: {
            ...where,
            status: 'APPROVED',
            isActive: true,
          },
        }),
        // Total demands
        prisma.serviceDemand.count({
          where: {
            ...where,
          },
        }),
        // Open demands
        prisma.serviceDemand.count({
          where: {
            ...where,
            status: 'OPEN',
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          totalProviders,
          totalSeekers,
          totalServices,
          activeServices,
          totalDemands,
          openDemands,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get statistics breakdown by all categories (NEPSE-style)
   */
  async getAllCategoriesStatistics(_req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await prisma.serviceCategory.findMany({
        where: { isActive: true },
        include: {
          subcategories: {
            where: { isActive: true },
          },
        },
        orderBy: { order: 'asc' },
      });

      const statistics = await Promise.all(
        categories.map(async (category) => {
          const [totalProviders, totalSeekers, totalServices, activeServices, totalDemands, openDemands] = await Promise.all([
            prisma.industrialKYC.count({
              where: {
                status: 'APPROVED',
                services: {
                  some: {
                    categoryId: category.id,
                    status: 'APPROVED',
                  },
                },
              },
            }),
            prisma.individualKYC.count({
              where: {
                status: 'APPROVED',
                serviceDemands: {
                  some: {
                    categoryId: category.id,
                  },
                },
              },
            }),
            prisma.service.count({
              where: {
                categoryId: category.id,
                status: 'APPROVED',
              },
            }),
            prisma.service.count({
              where: {
                categoryId: category.id,
                status: 'APPROVED',
                isActive: true,
              },
            }),
            prisma.serviceDemand.count({
              where: {
                categoryId: category.id,
              },
            }),
            prisma.serviceDemand.count({
              where: {
                categoryId: category.id,
                status: 'OPEN',
              },
            }),
          ]);

          return {
            categoryId: category.id,
            categoryName: category.name,
            totalProviders,
            totalSeekers,
            totalServices,
            activeServices,
            totalDemands,
            openDemands,
          };
        })
      );

      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top trending services
   */
  async getTrendingServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '10', categoryId } = req.query;
      const take = Math.min(Number(limit), 50);

      const where: any = {
        service: {
          status: 'APPROVED',
          isActive: true,
        },
      };

      if (categoryId) {
        where.categoryId = categoryId as string;
      }

      const trending = await prisma.trendingService.findMany({
        where,
        include: {
          service: {
            include: {
              category: true,
              subcategory: true,
              provider: {
                select: {
                  companyName: true,
                  yearsInBusiness: true,
                },
              },
            },
          },
        },
        orderBy: {
          trendScore: 'desc',
        },
        take,
      });

      res.json({
        success: true,
        data: trending.map((t) => ({
          serviceId: t.serviceId,
          title: t.service.title,
          categoryName: t.service.category.name,
          subcategoryName: t.service.subcategory?.name,
          providerName: t.service.provider.companyName,
          trendScore: t.trendScore,
          bookingGrowth: t.bookingGrowth,
          viewGrowth: t.viewGrowth,
          rating: t.rating,
          averageRating: t.service.averageRating,
          bookingCount: t.service.bookingCount,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top trending service providers
   */
  async getTrendingProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '10', categoryId } = req.query;
      const take = Math.min(Number(limit), 50);

      const providers = await prisma.industrialKYC.findMany({
        where: {
          status: 'APPROVED',
          services: {
            some: {
              status: 'APPROVED',
              isActive: true,
              ...(categoryId && { categoryId: categoryId as string }),
            },
          },
        },
        include: {
          services: {
            where: {
              status: 'APPROVED',
              isActive: true,
              ...(categoryId && { categoryId: categoryId as string }),
            },
            select: {
              id: true,
              bookingCount: true,
              averageRating: true,
              totalReviews: true,
              viewCount: true,
            },
          },
          _count: {
            select: {
              services: true,
            },
          },
        },
        take,
      });

      // Calculate trend scores
      const trendingProviders = providers
        .map((provider) => {
          const totalBookings = provider.services.reduce((sum, s) => sum + s.bookingCount, 0);
          const totalViews = provider.services.reduce((sum, s) => sum + s.viewCount, 0);
          const totalReviews = provider.services.reduce((acc, s) => acc + s.totalReviews, 0);
          const weightedRating = provider.services.reduce((acc, s) => acc + (s.averageRating || 0) * s.totalReviews, 0);
          const avgRating = totalReviews > 0 ? weightedRating / totalReviews : 0;

          // Simple trend score calculation
          const trendScore = (totalBookings * 0.4 + totalViews * 0.3 + avgRating * 30);

          return {
            providerId: provider.userId,
            companyName: provider.companyName,
            businessYears: provider.yearsInBusiness,
            totalServices: provider._count.services,
            totalBookings,
            totalViews,
            averageRating: avgRating || 0,
            trendScore,
          };
        })
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, take);

      res.json({
        success: true,
        data: trendingProviders,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get top trending service seekers
   */
  async getTrendingSeekers(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '10', categoryId } = req.query;
      const take = Math.min(Number(limit), 50);

      const seekers = await prisma.individualKYC.findMany({
        where: {
          status: 'APPROVED',
          serviceDemands: {
            some: {
              ...(categoryId && { categoryId: categoryId as string }),
            },
          },
        },
        include: {
          serviceDemands: {
            where: {
              ...(categoryId && { categoryId: categoryId as string }),
            },
            select: {
              id: true,
              responseCount: true,
              viewCount: true,
              status: true,
            },
          },
          serviceBookings: {
            where: {
              service: {
                ...(categoryId && { categoryId: categoryId as string }),
              },
            },
            select: {
              id: true,
              status: true,
            },
          },
          _count: {
            select: {
              serviceDemands: true,
              serviceBookings: true,
            },
          },
        },
        take: take * 2, // Get more to filter
      });

      // Calculate trend scores
      const trendingSeekers = seekers
        .map((seeker) => {
          const totalResponses = seeker.serviceDemands.reduce((sum, d) => sum + d.responseCount, 0);
          const totalViews = seeker.serviceDemands.reduce((sum, d) => sum + d.viewCount, 0);
          const totalBookings = seeker._count.serviceBookings;
          const activeDemands = seeker.serviceDemands.filter((d) => d.status === 'OPEN').length;

          // Simple trend score calculation
          const trendScore = (totalResponses * 0.3 + totalViews * 0.2 + totalBookings * 0.4 + activeDemands * 0.1);

          return {
            seekerId: seeker.userId,
            fullName: seeker.fullName,
            totalDemands: seeker._count.serviceDemands,
            totalBookings,
            totalResponses,
            totalViews,
            activeDemands,
            trendScore,
          };
        })
        .sort((a, b) => b.trendScore - a.trendScore)
        .slice(0, take);

      res.json({
        success: true,
        data: trendingSeekers,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get total list of teachers
   */
  async getTeachersList(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '50', page = '1' } = req.query;
      const take = Math.min(Number(limit), 100);
      const skip = (Number(page) - 1) * take;

      const teachers = await prisma.user.findMany({
        where: {
          isTeacher: true,
          status: 'ACTIVE',
          individualKYC: {
            status: 'APPROVED',
          },
        },
        include: {
          individualKYC: {
            select: {
              fullName: true,
              province: true,
              district: true,
              highestQualification: true,
              fieldOfStudy: true,
            },
          },
          courses: {
            select: {
              id: true,
              title: true,
              enrollmentCount: true,
              rating: true,
            },
          },
          _count: {
            select: {
              courses: true,
              courseEnrollments: true,
            },
          },
        },
        skip,
        take,
        orderBy: {
          courses: {
            _count: 'desc',
          },
        },
      });

      const total = await prisma.user.count({
        where: {
          isTeacher: true,
          status: 'ACTIVE',
          individualKYC: {
            status: 'APPROVED',
          },
        },
      });

      res.json({
        success: true,
        data: teachers.map((teacher) => ({
          userId: teacher.id,
          email: teacher.email,
          fullName: teacher.individualKYC?.fullName,
          province: teacher.individualKYC?.province,
          district: teacher.individualKYC?.district,
          qualification: teacher.individualKYC?.highestQualification,
          fieldOfStudy: teacher.individualKYC?.fieldOfStudy,
          totalCourses: teacher._count.courses,
          totalEnrollments: teacher._count.courseEnrollments,
          courses: teacher.courses,
        })),
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get total list of entertainers
   */
  async getEntertainersList(req: Request, res: Response, next: NextFunction) {
    try {
      const { limit = '50', page = '1' } = req.query;
      const take = Math.min(Number(limit), 100);
      const skip = (Number(page) - 1) * take;

      const entertainers = await prisma.user.findMany({
        where: {
          isEntertainer: true,
          status: 'ACTIVE',
        },
        include: {
          individualKYC: {
            select: {
              fullName: true,
              province: true,
              district: true,
            },
          },
          industrialKYC: {
            select: {
              companyName: true,
              province: true,
              district: true,
            },
          },
          entertainmentServices: {
            select: {
              id: true,
              title: true,
              entertainmentType: true,
              totalBookings: true,
              rating: true,
            },
          },
          _count: {
            select: {
              entertainmentServices: true,
            },
          },
        },
        skip,
        take,
        orderBy: {
          entertainmentServices: {
            _count: 'desc',
          },
        },
      });

      const total = await prisma.user.count({
        where: {
          isEntertainer: true,
          status: 'ACTIVE',
        },
      });

      res.json({
        success: true,
        data: entertainers.map((entertainer) => ({
          userId: entertainer.id,
          email: entertainer.email,
          name: entertainer.individualKYC?.fullName || entertainer.industrialKYC?.companyName,
          province: entertainer.individualKYC?.province || entertainer.industrialKYC?.province,
          district: entertainer.individualKYC?.district || entertainer.industrialKYC?.district,
          totalServices: entertainer._count.entertainmentServices,
          services: entertainer.entertainmentServices,
        })),
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get comprehensive data insights
   */
  async getDataInsights(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Only admins can access detailed insights
      if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required',
        });
      }

      const [
        categoryPerformance,
        geographicDistribution,
        revenueStats,
        userGrowth,
        bookingTrends,
      ] = await Promise.all([
        // Category performance
        prisma.serviceCategory.findMany({
          include: {
            _count: {
              select: {
                services: true,
                demands: true,
              },
            },
            services: {
              select: {
                bookingCount: true,
                averageRating: true,
              },
              take: 100,
            },
          },
        }),
        // Geographic distribution
        prisma.service.groupBy({
          by: ['province', 'district'],
          _count: {
            id: true,
          },
          where: {
            status: 'APPROVED',
            isActive: true,
          },
        }),
        // Revenue stats (from bookings)
        prisma.serviceBooking.aggregate({
          where: {
            status: 'COMPLETED',
            paymentStatus: 'PAID',
          },
          _sum: {
            agreedPrice: true,
          },
          _avg: {
            agreedPrice: true,
          },
          _count: {
            id: true,
          },
        }),
        // User growth (last 30 days)
        prisma.user.groupBy({
          by: ['createdAt'],
          _count: {
            id: true,
          },
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        // Booking trends (last 30 days)
        prisma.serviceBooking.groupBy({
          by: ['createdAt'],
          _count: {
            id: true,
          },
          where: {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      res.json({
        success: true,
        data: {
          categoryPerformance: categoryPerformance.map((cat) => ({
            categoryId: cat.id,
            categoryName: cat.name,
            totalServices: cat._count.services,
            totalDemands: cat._count.demands,
            averageBookings: cat.services.reduce((sum, s) => sum + s.bookingCount, 0) / Math.max(cat.services.length, 1),
            averageRating: cat.services.reduce((sum, s) => sum + (s.averageRating || 0), 0) / Math.max(cat.services.length, 1),
          })),
          geographicDistribution,
          revenue: {
            total: revenueStats._sum.agreedPrice || 0,
            average: revenueStats._avg.agreedPrice || 0,
            totalBookings: revenueStats._count.id,
          },
          userGrowth,
          bookingTrends,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();

