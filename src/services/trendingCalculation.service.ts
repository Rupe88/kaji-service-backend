import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface TrendingCalculationResult {
  serviceId: string;
  trendScore: number;
  bookingGrowth: number;
  viewGrowth: number;
  rating: number;
}

class TrendingCalculationService {
  /**
   * Calculate trending scores for all services
   */
  async calculateTrendingServices(): Promise<void> {
    try {
      console.log('🔄 Starting trending services calculation...');

      const services = await prisma.service.findMany({
        where: {
          status: 'APPROVED',
          isActive: true,
        },
        include: {
          bookings: {
            select: {
              createdAt: true,
            },
          },
          category: {
            select: {
              id: true,
            },
          },
        },
      });

      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const trendingUpdates = await Promise.all(
        services.map(async (service) => {
          // Calculate booking growth (last 7 days vs previous 7 days)
          const recentBookings = service.bookings.filter(
            (b) => b.createdAt >= sevenDaysAgo
          ).length;
          const previousBookings = service.bookings.filter(
            (b) => b.createdAt >= thirtyDaysAgo && b.createdAt < sevenDaysAgo
          ).length;

          const bookingGrowth =
            previousBookings > 0
              ? ((recentBookings - previousBookings) / previousBookings) * 100
              : recentBookings > 0
              ? 100
              : 0;

          // Calculate view growth (simplified - would need view history)
          const viewGrowth = service.viewCount > 0 ? Math.min(service.viewCount / 100, 100) : 0;

          // Get rating
          const rating = service.averageRating || 0;

          // Calculate trend score
          const trendScore = this.calculateTrendScore(
            service.bookingCount,
            bookingGrowth,
            service.viewCount,
            viewGrowth,
            rating,
            service.customerSatisfactionScore || 0
          );

          return {
            serviceId: service.id,
            categoryId: service.categoryId,
            trendScore,
            bookingGrowth,
            viewGrowth,
            rating,
            province: service.province,
            district: service.district,
          };
        })
      );

      // Update or create trending service records
      for (const update of trendingUpdates) {
        await prisma.trendingService.upsert({
          where: { serviceId: update.serviceId },
          update: {
            trendScore: update.trendScore,
            bookingGrowth: update.bookingGrowth,
            viewGrowth: update.viewGrowth,
            rating: update.rating,
            calculatedAt: new Date(),
          },
          create: {
            serviceId: update.serviceId,
            categoryId: update.categoryId,
            trendScore: update.trendScore,
            bookingGrowth: update.bookingGrowth,
            viewGrowth: update.viewGrowth,
            rating: update.rating,
            province: update.province,
            district: update.district,
          },
        });
      }

      console.log(`✅ Calculated trending scores for ${trendingUpdates.length} services`);
    } catch (error) {
      console.error('❌ Error calculating trending services:', error);
      throw error;
    }
  }

  /**
   * Calculate trend score
   */
  private calculateTrendScore(
    bookingCount: number,
    bookingGrowth: number,
    viewCount: number,
    _viewGrowth: number,
    rating: number,
    customerSatisfaction: number
  ): number {
    const bookingWeight = 0.3;
    const growthWeight = 0.25;
    const viewWeight = 0.2;
    const ratingWeight = 0.15;
    const satisfactionWeight = 0.1;

    const bookingScore = Math.min(bookingCount / 10, 100); // Normalize to 0-100
    const growthScore = Math.min(Math.max(bookingGrowth, -50), 100); // Clamp growth
    const viewScore = Math.min(viewCount / 100, 100); // Normalize views
    const ratingScore = (rating / 5) * 100; // Convert 0-5 to 0-100
    const satisfactionScore = ((customerSatisfaction || rating) / 5) * 100;

    return (
      bookingScore * bookingWeight +
      growthScore * growthWeight +
      viewScore * viewWeight +
      ratingScore * ratingWeight +
      satisfactionScore * satisfactionWeight
    );
  }

  /**
   * Calculate trending analytics for providers and seekers
   */
  async calculateTrendingAnalytics(): Promise<void> {
    try {
      console.log('🔄 Starting trending analytics calculation...');

      // Calculate for providers
      const providers = await prisma.industrialKYC.findMany({
        where: {
          status: 'APPROVED',
        },
        include: {
          services: {
            where: {
              status: 'APPROVED',
              isActive: true,
            },
            select: {
              bookingCount: true,
              viewCount: true,
              averageRating: true,
              customerSatisfactionScore: true,
              createdAt: true,
            },
          },
        },
      });

      const now = new Date();

      for (const provider of providers) {
        const recentBookings = provider.services.reduce(
          (sum, s) => sum + s.bookingCount,
          0
        );
        const totalViews = provider.services.reduce((sum, s) => sum + s.viewCount, 0);
        const avgRating =
          provider.services.reduce((sum, s) => sum + (s.averageRating || 0), 0) /
          Math.max(provider.services.length, 1);
        const avgSatisfaction =
          provider.services.reduce(
            (sum, s) => sum + (s.customerSatisfactionScore || 0),
            0
          ) / Math.max(provider.services.length, 1);

        const bookingGrowth = recentBookings > 0 ? 10 : 0; // Simplified
        const viewGrowth = totalViews > 0 ? 5 : 0; // Simplified

        // Create new trending analytics record (historical tracking)
        await prisma.trendingAnalytics.create({
          data: {
            entityType: 'PROVIDER',
            entityId: provider.userId,
            trendScore: this.calculateTrendScore(
              recentBookings,
              bookingGrowth,
              totalViews,
              viewGrowth,
              avgRating,
              avgSatisfaction
            ),
            bookingGrowth,
            viewGrowth,
            rating: avgRating,
            customerSatisfaction: avgSatisfaction,
            calculatedAt: now,
          },
        });
      }

      // Calculate for seekers
      const seekers = await prisma.individualKYC.findMany({
        where: {
          status: 'APPROVED',
        },
        include: {
          serviceDemands: {
            select: {
              responseCount: true,
              viewCount: true,
              createdAt: true,
            },
          },
          serviceBookings: {
            select: {
              createdAt: true,
            },
          },
        },
      });

      for (const seeker of seekers) {
        const totalResponses = seeker.serviceDemands.reduce(
          (sum, d) => sum + d.responseCount,
          0
        );
        const totalViews = seeker.serviceDemands.reduce((sum, d) => sum + d.viewCount, 0);
        const totalBookings = seeker.serviceBookings.length;

        const viewGrowth = totalViews > 0 ? 3 : 0;

        // Create new trending analytics record (historical tracking)
        await prisma.trendingAnalytics.create({
          data: {
            entityType: 'SEEKER',
            entityId: seeker.userId,
            trendScore: totalBookings * 10 + totalResponses * 5 + totalViews * 0.1,
            bookingGrowth: totalBookings,
            viewGrowth: viewGrowth,
            rating: null,
            customerSatisfaction: null,
            calculatedAt: now,
          },
        });
      }

      console.log('✅ Calculated trending analytics');
    } catch (error) {
      console.error('❌ Error calculating trending analytics:', error);
      throw error;
    }
  }

  /**
   * Run all trending calculations
   */
  async runAllCalculations(): Promise<void> {
    await this.calculateTrendingServices();
    await this.calculateTrendingAnalytics();
  }
}

export const trendingCalculationService = new TrendingCalculationService();
export default trendingCalculationService;

