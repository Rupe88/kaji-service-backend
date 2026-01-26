import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  createServiceDemandSchema,
  createDemandResponseSchema,
  demandSearchSchema,
  createBookingSchema
} from '../types/service.types';
import { buildDemandSearchQuery, calculatePagination, getDemandSortConfig } from '../utils/service.util';


const prisma = new PrismaClient();

export class ServiceDemandController {
  /**
   * Create service demand
   */
  async createDemand(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createServiceDemandSchema.parse(req.body);

      // Check if user is individual and KYC approved
      const individual = await prisma.individualKYC.findUnique({
        where: { userId },
        select: { status: true }
      });

      if (!individual || individual.status !== 'APPROVED') {
        return res.status(403).json({
          success: false,
          message: 'Your KYC must be approved to post service demands'
        });
      }

      const demand = await prisma.serviceDemand.create({
        data: {
          seekerId: userId,
          ...body,
          status: 'OPEN'
        },
        include: {
          category: true,
          subcategory: true,
          seeker: {
            select: {
              fullName: true,
              province: true,
              district: true
            }
          }
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Service demand created successfully',
        data: demand
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Search service demands
   */
  async searchDemands(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = demandSearchSchema.parse(req.query);
      const where = buildDemandSearchQuery(filters);
      const orderBy = getDemandSortConfig(filters.sortBy, filters.sortOrder);

      const skip = (filters.page - 1) * filters.limit;

      const total = await prisma.serviceDemand.count({ where });

      const demands = await prisma.serviceDemand.findMany({
        where,
        orderBy,
        skip,
        take: filters.limit,
        include: {
          seeker: {
            select: {
              fullName: true,
              province: true,
              district: true
            }
          },
          category: {
            select: { name: true }
          },
          subcategory: {
            select: { name: true }
          },
          _count: {
            select: { responses: true }
          }
        }
      });

      const pagination = calculatePagination(total, filters.page, filters.limit);

      res.json({
        success: true,
        data: demands,
        pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get demand by ID
   */
  async getDemandById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const demand = await prisma.serviceDemand.findUnique({
        where: { id },
        include: {
          seeker: {
            select: {
              fullName: true,
              email: true,
              phone: true,
              province: true,
              district: true,
              municipality: true
            }
          },
          category: true,
          subcategory: true,
          responses: {
            include: {
              provider: {
                select: {
                  companyName: true,
                  companyEmail: true,
                  companyPhone: true,
                  yearsInBusiness: true
                }
              }
            },
            orderBy: { respondedAt: 'desc' }
          }
        }
      });

      if (!demand) {
        return res.status(404).json({
          success: false,
          message: 'Demand not found'
        });
      }

      // Increment view count
      await prisma.serviceDemand.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });

      return res.json({
        success: true,
        data: demand
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Respond to service demand
   */
  async respondToDemand(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createDemandResponseSchema.parse(req.body);

      // Check if user is industrial and KYC approved
      const industrial = await prisma.industrialKYC.findUnique({
        where: { userId },
        select: { status: true }
      });

      if (!industrial || industrial.status !== 'APPROVED') {
        return res.status(403).json({
          success: false,
          message: 'Your KYC must be approved to respond to demands'
        });
      }

      // Check if demand exists and is open
      const demand = await prisma.serviceDemand.findUnique({
        where: { id: body.demandId },
        select: { status: true, seekerId: true }
      });

      if (!demand) {
        return res.status(404).json({
          success: false,
          message: 'Demand not found'
        });
      }

      if (demand.status !== 'OPEN') {
        return res.status(400).json({
          success: false,
          message: 'This demand is no longer accepting responses'
        });
      }

      // Create response
      const response = await prisma.serviceDemandResponse.create({
        data: {
          demandId: body.demandId,
          providerId: userId,
          message: body.message,
          quotedPrice: body.quotedPrice,
          timeline: body.timeline
        },
        include: {
          provider: {
            select: {
              companyName: true,
              companyPhone: true,
              yearsInBusiness: true
            }
          }
        }
      });

      // Update demand response count
      await prisma.serviceDemand.update({
        where: { id: body.demandId },
        data: { responseCount: { increment: 1 } }
      });

      // Notify seeker
      await prisma.notification.create({
        data: {
          userId: demand.seekerId,
          type: 'DEMAND_RESPONSE',
          title: 'New Response to Your Demand',
          message: `${response.provider.companyName} has responded to your service demand`,
          data: { responseId: response.id, demandId: body.demandId }
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Response submitted successfully',
        data: response
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get user's demands
   */
  async getUserDemands(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      const where: any = { seekerId: userId };
      if (status) where.status = status;

      const demands = await prisma.serviceDemand.findMany({
        where,
        include: {
          category: true,
          subcategory: true,
          _count: {
            select: { responses: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: demands
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update demand status
   */
  async updateDemandStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status } = req.body;

      const demand = await prisma.serviceDemand.findUnique({
        where: { id },
        select: { seekerId: true }
      });

      if (!demand) {
        return res.status(404).json({
          success: false,
          message: 'Demand not found'
        });
      }

      if (demand.seekerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }

      const updated = await prisma.serviceDemand.update({
        where: { id },
        data: { status }
      });

      return res.json({
        success: true,
        message: 'Demand status updated',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }
}

// ============ Service Booking Controller ============

export class ServiceBookingController {
  /**
   * Create service booking
   */
  async createBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createBookingSchema.parse(req.body);

      // Check if user is individual and KYC approved
      const individual = await prisma.individualKYC.findUnique({
        where: { userId },
        select: { status: true }
      });

      if (!individual || individual.status !== 'APPROVED') {
        return res.status(403).json({
          success: false,
          message: 'Your KYC must be approved to book services'
        });
      }

      // Check if service exists and is active
      const service = await prisma.service.findUnique({
        where: { id: body.serviceId },
        select: { 
          isActive: true, 
          status: true, 
          providerId: true,
          provider: {
            select: {
              userId: true,
              companyName: true
            }
          }
        }
      });

      if (!service || !service.isActive || service.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Service is not available for booking'
        });
      }

      const booking = await prisma.serviceBooking.create({
        data: {
          serviceId: body.serviceId,
          customerId: userId,
          bookingDate: new Date(),
          scheduledDate: new Date(body.scheduledDate),
          scheduledTime: body.scheduledTime,
          duration: body.duration,
          agreedPrice: body.agreedPrice,
          paymentMethod: body.paymentMethod,
          serviceLocation: body.serviceLocation,
          latitude: body.latitude,
          longitude: body.longitude,
          customerNotes: body.customerNotes,
          eventDetails: body.eventDetails,
          statement: body.statement,
          contractualTerms: body.contractualTerms,
          wireTransferDetails: body.wireTransferDetails,
          status: 'PENDING',
          paymentStatus: 'PENDING'
        },
        include: {
          service: {
            select: {
              title: true,
              provider: {
                select: { companyName: true }
              }
            }
          }
        }
      });

      // Update service booking count
      await prisma.service.update({
        where: { id: body.serviceId },
        data: { bookingCount: { increment: 1 } }
      });

      // Notify provider
      await prisma.notification.create({
        data: {
          userId: service.provider.userId,
          type: 'NEW_BOOKING',
          title: 'New Service Booking',
          message: `You have a new booking for ${booking.service.title}`,
          data: { bookingId: booking.id }
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const booking = await prisma.serviceBooking.findUnique({
        where: { id },
        include: {
          service: {
            include: {
              provider: {
                select: {
                  companyName: true,
                  companyEmail: true,
                  companyPhone: true
                }
              }
            }
          },
          customer: {
            select: {
              fullName: true,
              email: true,
              phone: true
            }
          },
          review: true
        }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      // Check authorization
      if (booking.customerId !== userId && booking.service.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to view this booking'
        });
      }

      return res.json({
        success: true,
        data: booking
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get user's bookings (as customer)
   */
  async getCustomerBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      const where: any = { customerId: userId };
      if (status) where.status = status;

      const bookings = await prisma.serviceBooking.findMany({
        where,
        include: {
          service: {
            select: {
              title: true,
              provider: {
                select: { companyName: true }
              }
            }
          }
        },
        orderBy: { bookingDate: 'desc' }
      });

      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider's bookings
   */
  async getProviderBookings(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      const where: any = {
        service: {
          providerId: userId
        }
      };
      if (status) where.status = status;

      const bookings = await prisma.serviceBooking.findMany({
        where,
        include: {
          service: {
            select: { title: true }
          },
          customer: {
            select: {
              fullName: true,
              phone: true
            }
          }
        },
        orderBy: { bookingDate: 'desc' }
      });

      res.json({
        success: true,
        data: bookings
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update booking status (provider)
   */
  async updateBookingStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status, providerNotes } = req.body;

      const booking = await prisma.serviceBooking.findUnique({
        where: { id },
        include: {
          service: {
            select: { providerId: true }
          },
          customer: {
            select: { userId: true }
          }
        }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.service.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }

      const updateData: any = { status, providerNotes };

      if (status === 'IN_PROGRESS') {
        updateData.startedAt = new Date();
      } else if (status === 'COMPLETED') {
        updateData.completedAt = new Date();
        // Update service completion count
        await prisma.service.update({
          where: { id: booking.serviceId },
          data: { completionCount: { increment: 1 } }
        });
      }

      const updated = await prisma.serviceBooking.update({
        where: { id },
        data: updateData
      });

      // Notify customer
      await prisma.notification.create({
        data: {
          userId: booking.customer.userId,
          type: 'BOOKING_STATUS_UPDATE',
          title: 'Booking Status Updated',
          message: `Your booking status has been updated to ${status}`,
          data: { bookingId: id }
        }
      });

      return res.json({
        success: true,
        message: 'Booking status updated',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Cancel booking
   */
  async cancelBooking(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { reason } = req.body;

      const booking = await prisma.serviceBooking.findUnique({
        where: { id },
        select: {
          customerId: true,
          status: true,
          service: {
            select: {
              providerId: true,
              provider: {
                select: { userId: true }
              }
            }
          }
        }
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }

      if (booking.customerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized'
        });
      }

      if (booking.status === 'COMPLETED' || booking.status === 'CANCELLED') {
        return res.status(400).json({
          success: false,
          message: 'Cannot cancel this booking'
        });
      }

      const updated = await prisma.serviceBooking.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: reason
        }
      });

      // Notify provider
      await prisma.notification.create({
        data: {
          userId: booking.service.provider.userId,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled',
          message: `A booking has been cancelled. Reason: ${reason}`,
          data: { bookingId: id }
        }
      });

      return res.json({
        success: true,
        message: 'Booking cancelled',
        data: updated
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Get available demands for service providers (public endpoint)
   */
  async getAvailableDemands(req: Request, res: Response, next: NextFunction) {
    try {
      const { page = 1, limit = 10, categoryId, province, district } = req.query;

      const pageNum = parseInt(page as string, 10) || 1;
      const limitNum = parseInt(limit as string, 10) || 10;
      const skip = (pageNum - 1) * limitNum;

      const where: any = {
        status: 'OPEN',
      };

      // Add optional filters
      if (categoryId) where.categoryId = categoryId;
      if (province) where.province = province;
      if (district) where.district = district;

      const [demands, total] = await Promise.all([
        prisma.serviceDemand.findMany({
          where,
          include: {
            category: true,
            subcategory: true,
            seeker: {
              select: {
                fullName: true,
                province: true,
                district: true,
                city: true
              }
            },
            responses: {
              where: { status: 'ACCEPTED' },
              select: { id: true }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum
        }),
        prisma.serviceDemand.count({ where })
      ]);

      // Filter out demands that already have accepted responses
      const availableDemands = demands.filter(demand =>
        demand.responses.length === 0
      );

      const pagination = {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      };

      return res.json({
        success: true,
        data: availableDemands,
        pagination
      });
    } catch (error) {
      return next(error);
    }
  }
}

/**
 * Get available demands for service providers (public endpoint)
 */
export async function getAvailableDemands(req: Request, res: Response, next: NextFunction) {
  try {
    const { page = 1, limit = 10, categoryId, province, district } = req.query;

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      status: 'OPEN',
    };

    // Add optional filters
    if (categoryId) where.categoryId = categoryId;
    if (province) where.province = province;
    if (district) where.district = district;

    const prisma = new PrismaClient();

    const [demands, total] = await Promise.all([
      prisma.serviceDemand.findMany({
        where,
        include: {
          category: true,
          subcategory: true,
          seeker: {
            select: {
              fullName: true,
              province: true,
              district: true,
              city: true
            }
          },
          responses: {
            where: { status: 'ACCEPTED' },
            select: { id: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.serviceDemand.count({ where })
    ]);

    // Filter out demands that already have accepted responses
    const availableDemands = demands.filter(demand =>
      demand.responses.length === 0
    );

    const pagination = {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum)
    };

    return res.json({
      success: true,
      data: availableDemands,
      pagination
    });
  } catch (error) {
    return next(error);
  }
};

export const serviceDemandController = new ServiceDemandController();
export const serviceBookingController = new ServiceBookingController();