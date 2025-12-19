import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import {
  createReviewSchema,
  updateReviewSchema,
  providerResponseSchema,
  reviewQuerySchema,
} from '../types/review.types';

const prisma = new PrismaClient();

export class ReviewController {
  /**
   * Create a review for a completed booking
   */
  async createReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createReviewSchema.parse(req.body);

      // Check if booking exists and belongs to user
      const booking = await prisma.serviceBooking.findUnique({
        where: { id: body.bookingId },
        include: {
          customer: {
            select: { userId: true },
          },
          service: {
            select: {
              id: true,
              providerId: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found',
        });
      }

      if (booking.customer.userId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only review your own bookings',
        });
      }

      if (booking.status !== 'COMPLETED') {
        return res.status(400).json({
          success: false,
          message: 'You can only review completed bookings',
        });
      }

      // Check if review already exists
      const existingReview = await prisma.serviceReview.findUnique({
        where: { bookingId: body.bookingId },
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: 'Review already exists for this booking',
        });
      }

      // Create review
      const review = await prisma.serviceReview.create({
        data: {
          bookingId: body.bookingId,
          serviceId: booking.service.id,
          customerId: booking.customer.userId,
          rating: body.rating,
          review: body.review,
          qualityRating: body.qualityRating,
          timelinessRating: body.timelinessRating,
          communicationRating: body.communicationRating,
          valueRating: body.valueRating,
          images: body.images,
        },
        include: {
          customer: {
            select: {
              fullName: true,
              profilePhotoUrl: true,
            },
          },
          service: {
            select: {
              title: true,
            },
          },
        },
      });

      // Update service average rating
      await this.updateServiceRating(booking.service.id);

      return res.status(201).json({
        success: true,
        message: 'Review created successfully',
        data: review,
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
   * Update own review
   */
  async updateReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const body = updateReviewSchema.parse(req.body);

      const review = await prisma.serviceReview.findUnique({
        where: { id },
        include: {
          service: {
            select: { id: true },
          },
        },
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      if (review.customerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own reviews',
        });
      }

      const updatedReview = await prisma.serviceReview.update({
        where: { id },
        data: body,
        include: {
          customer: {
            select: {
              fullName: true,
              profilePhotoUrl: true,
            },
          },
          service: {
            select: {
              title: true,
            },
          },
        },
      });

      // Update service average rating
      await this.updateServiceRating(review.service.id);

      return res.json({
        success: true,
        message: 'Review updated successfully',
        data: updatedReview,
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
   * Delete own review
   */
  async deleteReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const review = await prisma.serviceReview.findUnique({
        where: { id },
        include: {
          service: {
            select: { id: true },
          },
        },
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      if (review.customerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only delete your own reviews',
        });
      }

      await prisma.serviceReview.delete({
        where: { id },
      });

      // Update service average rating
      await this.updateServiceRating(review.service.id);

      return res.json({
        success: true,
        message: 'Review deleted successfully',
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get review by ID
   */
  async getReviewById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const review = await prisma.serviceReview.findUnique({
        where: { id },
        include: {
          customer: {
            select: {
              fullName: true,
              profilePhotoUrl: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              provider: {
                select: {
                  companyName: true,
                },
              },
            },
          },
          booking: {
            select: {
              id: true,
              scheduledDate: true,
            },
          },
        },
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      return res.json({
        success: true,
        data: review,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get reviews with filters
   */
  async getReviews(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const query = reviewQuerySchema.parse(req.query);
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;
      const take = limit;

      const where: any = {};

      if (query.serviceId) {
        where.serviceId = query.serviceId;
      }

      if (query.customerId) {
        where.customerId = query.customerId;
      }

      if (query.minRating || query.maxRating) {
        where.rating = {};
        if (query.minRating) where.rating.gte = query.minRating;
        if (query.maxRating) where.rating.lte = query.maxRating;
      }

      if (query.hasResponse !== undefined) {
        if (query.hasResponse) {
          where.providerResponse = { not: null };
        } else {
          where.providerResponse = null;
        }
      }

      if (query.isVerified !== undefined) {
        where.isVerified = query.isVerified;
      }

      const orderBy: any = {};
      switch (query.sortBy) {
        case 'newest':
          orderBy.createdAt = 'desc';
          break;
        case 'oldest':
          orderBy.createdAt = 'asc';
          break;
        case 'highest':
          orderBy.rating = 'desc';
          break;
        case 'lowest':
          orderBy.rating = 'asc';
          break;
        case 'most_helpful':
          // For now, use rating as proxy for helpfulness
          orderBy.rating = 'desc';
          break;
      }

      const [reviews, total] = await Promise.all([
        prisma.serviceReview.findMany({
          where,
          include: {
            customer: {
              select: {
                fullName: true,
                profilePhotoUrl: true,
              },
            },
            service: {
              select: {
                id: true,
                title: true,
              },
            },
          },
          skip,
          take,
          orderBy,
        }),
        prisma.serviceReview.count({ where }),
      ]);

      return res.json({
        success: true,
        data: reviews,
        pagination: {
          page: query.page,
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors,
        });
      }
      return next(error);
    }
  }

  /**
   * Provider responds to a review
   */
  async respondToReview(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const body = providerResponseSchema.parse(req.body);

      const review = await prisma.serviceReview.findUnique({
        where: { id },
        include: {
          service: {
            select: {
              providerId: true,
            },
          },
        },
      });

      if (!review) {
        return res.status(404).json({
          success: false,
          message: 'Review not found',
        });
      }

      // Check if user is the service provider
      const provider = await prisma.industrialKYC.findUnique({
        where: { userId },
        select: { userId: true },
      });

      if (!provider || review.service.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Only the service provider can respond to reviews',
        });
      }

      const updatedReview = await prisma.serviceReview.update({
        where: { id },
        data: {
          providerResponse: body.response,
          respondedAt: new Date(),
        },
        include: {
          customer: {
            select: {
              fullName: true,
              profilePhotoUrl: true,
            },
          },
          service: {
            select: {
              title: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        message: 'Response added successfully',
        data: updatedReview,
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
   * Get service statistics (ratings breakdown)
   */
  async getServiceReviewStats(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { serviceId } = req.params;

      const [reviews, stats] = await Promise.all([
        prisma.serviceReview.findMany({
          where: { serviceId },
          select: {
            rating: true,
            qualityRating: true,
            timelinessRating: true,
            communicationRating: true,
            valueRating: true,
          },
        }),
        prisma.serviceReview.aggregate({
          where: { serviceId },
          _avg: {
            rating: true,
            qualityRating: true,
            timelinessRating: true,
            communicationRating: true,
            valueRating: true,
          },
          _count: {
            id: true,
          },
        }),
      ]);

      // Calculate rating distribution
      const ratingDistribution = {
        5: reviews.filter((r) => r.rating === 5).length,
        4: reviews.filter((r) => r.rating === 4).length,
        3: reviews.filter((r) => r.rating === 3).length,
        2: reviews.filter((r) => r.rating === 2).length,
        1: reviews.filter((r) => r.rating === 1).length,
      };

      return res.json({
        success: true,
        data: {
          totalReviews: stats._count.id,
          averageRating: stats._avg.rating || 0,
          averageQualityRating: stats._avg.qualityRating || 0,
          averageTimelinessRating: stats._avg.timelinessRating || 0,
          averageCommunicationRating: stats._avg.communicationRating || 0,
          averageValueRating: stats._avg.valueRating || 0,
          ratingDistribution,
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Helper: Update service average rating
   */
  private async updateServiceRating(serviceId: string): Promise<void> {
    const stats = await prisma.serviceReview.aggregate({
      where: { serviceId },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    await prisma.service.update({
      where: { id: serviceId },
      data: {
        averageRating: stats._avg.rating || null,
        totalReviews: stats._count.id,
      },
    });
  }
}

export const reviewController = new ReviewController();

