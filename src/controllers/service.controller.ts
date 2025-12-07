// src/controllers/service.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceSearchSchema,
  CreateServiceInput
} from '../types/service.types';
import { buildServiceSearchQuery, calculateDistance, calculatePagination, checkProviderEligibility, getServiceSortConfig } from '../utils/service.util';


const prisma = new PrismaClient();

export class ServiceController {
  /**
   * Create a new service listing
   */
  async createService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id; // From auth middleware
      const body = createServiceSchema.parse(req.body);

      // Check if user is industrial and KYC is approved
      const industrial = await prisma.industrialKYC.findUnique({
        where: { userId },
        select: { status: true }
      });

      if (!industrial) {
        return res.status(403).json({
          success: false,
          message: 'Only industrial users can create services'
        });
      }

      const eligibility = checkProviderEligibility(industrial.status);
      if (!eligibility.eligible) {
        return res.status(403).json({
          success: false,
          message: eligibility.reason
        });
      }

      // Create service
      const service = await prisma.service.create({
        data: {
          providerId: userId,
          ...body,
          status: 'PENDING' // Requires admin approval
        },
        include: {
          category: true,
          subcategory: true,
          provider: {
            select: {
              companyName: true,
              province: true,
              district: true
            }
          }
        }
      });

      // Create notification for admin
      await prisma.notification.create({
        data: {
          userId: 'ADMIN_ID', // Replace with actual admin notification logic
          type: 'SERVICE_SUBMITTED',
          title: 'New Service Submitted',
          message: `${service.title} submitted by ${service.provider.companyName}`,
          data: { serviceId: service.id }
        }
      });

      res.status(201).json({
        success: true,
        message: 'Service created successfully. Pending admin approval.',
        data: service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update service
   */
  async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const body = updateServiceSchema.parse(req.body);

      // Check ownership
      const service = await prisma.service.findUnique({
        where: { id },
        select: { providerId: true, status: true }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      if (service.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this service'
        });
      }

      // Update service
      const updated = await prisma.service.update({
        where: { id },
        data: {
          ...body,
          status: 'PENDING' // Require re-approval after update
        },
        include: {
          category: true,
          subcategory: true
        }
      });

      res.json({
        success: true,
        message: 'Service updated successfully',
        data: updated
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search services with filters
   */
  async searchServices(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = serviceSearchSchema.parse(req.query);
      const where = buildServiceSearchQuery(filters);
      const orderBy = getServiceSortConfig(filters.sortBy, filters.sortOrder);

      const skip = (filters.page - 1) * filters.limit;

      // Get total count
      const total = await prisma.service.count({ where });

      // Get services
      let services = await prisma.service.findMany({
        where,
        orderBy,
        skip,
        take: filters.limit,
        include: {
          provider: {
            select: {
              companyName: true,
              yearsInBusiness: true,
              province: true,
              district: true
            }
          },
          category: {
            select: { name: true }
          },
          subcategory: {
            select: { name: true }
          }
        }
      });

      // Calculate distance if location provided
      if (filters.latitude && filters.longitude) {
        services = services.map(service => ({
          ...service,
          distance: service.latitude && service.longitude
            ? calculateDistance(
                filters.latitude!,
                filters.longitude!,
                service.latitude,
                service.longitude
              )
            : null
        })) as any;

        // Filter by max distance if specified
        if (filters.maxDistance) {
          services = services.filter(s => 
            (s as any).distance !== null && (s as any).distance <= filters.maxDistance!
          );
        }

        // Sort by distance if that's the sort criteria
        if (filters.sortBy === 'distance') {
          services.sort((a, b) => {
            const distA = (a as any).distance || Infinity;
            const distB = (b as any).distance || Infinity;
            return filters.sortOrder === 'asc' ? distA - distB : distB - distA;
          });
        }
      }

      const pagination = calculatePagination(total, filters.page, filters.limit);

      res.json({
        success: true,
        data: services,
        pagination
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get service by ID
   */
  async getServiceById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const service = await prisma.service.findUnique({
        where: { id },
        include: {
          provider: {
            select: {
              companyName: true,
              companyEmail: true,
              companyPhone: true,
              yearsInBusiness: true,
              companySize: true,
              industrySector: true,
              province: true,
              district: true,
              municipality: true
            }
          },
          category: true,
          subcategory: true,
          reviews: {
            take: 10,
            orderBy: { createdAt: 'desc' },
            include: {
              customer: {
                select: {
                  fullName: true,
                  profilePhotoUrl: true
                }
              }
            }
          }
        }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      // Increment view count
      await prisma.service.update({
        where: { id },
        data: { viewCount: { increment: 1 } }
      });

      res.json({
        success: true,
        data: service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get provider's services
   */
  async getProviderServices(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status } = req.query;

      const where: Prisma.ServiceWhereInput = {
        providerId: userId
      };

      if (status) {
        where.status = status as any;
      }

      const services = await prisma.service.findMany({
        where,
        include: {
          category: true,
          subcategory: true
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: services
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete service
   */
  async deleteService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // Check ownership
      const service = await prisma.service.findUnique({
        where: { id },
        select: { providerId: true }
      });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: 'Service not found'
        });
      }

      if (service.providerId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this service'
        });
      }

      // Soft delete - just mark as inactive
      await prisma.service.update({
        where: { id },
        data: { isActive: false, status: 'INACTIVE' }
      });

      res.json({
        success: true,
        message: 'Service deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get trending services
   */
  async getTrendingServices(req: Request, res: Response, next: NextFunction) {
    try {
      const { categoryId, province, limit = 10 } = req.query;

      const where: Prisma.TrendingServiceWhereInput = {};
      if (categoryId) where.categoryId = categoryId as string;
      if (province) where.province = province as string;

      const trending = await prisma.trendingService.findMany({
        where,
        take: Number(limit),
        orderBy: { trendScore: 'desc' },
        include: {
          service: {
            include: {
              category: true,
              provider: {
                select: { companyName: true }
              }
            }
          }
        }
      });

      res.json({
        success: true,
        data: trending
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { province, district } = req.query;

      const where: Prisma.ServiceWhereInput = {
        isActive: true,
        status: 'APPROVED'
      };

      if (province) where.province = province as string;
      if (district) where.district = district as string;

      const categories = await prisma.serviceCategory.findMany({
        where: { isActive: true },
        include: {
          _count: {
            select: {
              services: { where }
            }
          }
        },
        orderBy: { order: 'asc' }
      });

      const stats = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        totalServices: cat._count.services
      }));

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Approve service
   */
  async approveService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const service = await prisma.service.update({
        where: { id },
        data: {
          status: 'APPROVED',
          isVerified: true,
          verifiedBy: userId,
          verifiedAt: new Date()
        },
        include: {
          provider: {
            select: {
              userId: true,
              companyName: true
            }
          }
        }
      });

      // Notify provider
      await prisma.notification.create({
        data: {
          userId: service.provider.userId,
          type: 'SERVICE_APPROVED',
          title: 'Service Approved',
          message: `Your service "${service.title}" has been approved and is now live.`,
          data: { serviceId: service.id }
        }
      });

      res.json({
        success: true,
        message: 'Service approved successfully',
        data: service
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin: Reject service
   */
  async rejectService(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const service = await prisma.service.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: reason
        },
        include: {
          provider: {
            select: {
              userId: true,
              companyName: true
            }
          }
        }
      });

      // Notify provider
      await prisma.notification.create({
        data: {
          userId: service.provider.userId,
          type: 'SERVICE_REJECTED',
          title: 'Service Rejected',
          message: `Your service "${service.title}" was rejected. Reason: ${reason}`,
          data: { serviceId: service.id }
        }
      });

      res.json({
        success: true,
        message: 'Service rejected',
        data: service
      });
    } catch (error) {
      next(error);
    }
  }
}

export const serviceController = new ServiceController();