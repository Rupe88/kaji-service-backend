// src/controllers/service.controller.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient, Prisma, ServiceStatus } from '@prisma/client';
import {
  createServiceSchema,
  updateServiceSchema,
  serviceSearchSchema
} from '../types/service.types';
import { buildServiceSearchQuery, calculatePagination, checkProviderEligibility, getServiceSortConfig } from '../utils/service.util';

// Haversine formula to calculate distance between two points on Earth
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in kilometers

  return distance;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

import { uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';

// Utility function to parse FormData values to correct types
function parseFormDataValue(value: any): any {
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // Handle empty strings
    if (trimmed === '') return undefined;

    // Try to parse as number (but not if it starts with 0 and has more digits, or contains non-numeric chars except decimal point)
    if (!isNaN(Number(trimmed)) && !isNaN(parseFloat(trimmed))) {
      const num = Number(trimmed);
      // Check if it's a valid number and not NaN
      if (!isNaN(num) && isFinite(num)) {
        return num;
      }
    }

    // Try to parse as boolean
    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    // Try to parse as JSON array/object
    try {
      const parsed = JSON.parse(trimmed);
      return parsed;
    } catch {
      // Return as string if nothing else works
      return trimmed;
    }
  }
  return value;
}

// Parse FormData object to correct types
function parseFormData(formData: any): any {
  const parsed: any = {};

  for (const [key, value] of Object.entries(formData)) {
    if (Array.isArray(value)) {
      parsed[key] = value.map(parseFormDataValue);
    } else {
      parsed[key] = parseFormDataValue(value);
    }
  }

  return parsed;
}



const prisma = new PrismaClient();

export class ServiceController {
  /**
   * Create a new service listing
   */
  async createService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id; // From auth middleware

      // Parse FormData if multipart, otherwise use JSON body
      let parsedBody = req.body;
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        parsedBody = parseFormData(req.body);
      }

      const body = createServiceSchema.parse(parsedBody);

      // Debug logging
      console.log('Creating service for user:', userId);
      console.log('Received categoryId:', body.categoryId);
      console.log('Full request body:', JSON.stringify(body, null, 2));

      // Verify category exists
      const category = await prisma.serviceCategory.findUnique({
        where: { id: body.categoryId }
      });

      if (!category) {
        console.error('Category not found:', body.categoryId);
        return res.status(400).json({
          success: false,
          message: `Invalid category ID: ${body.categoryId}`
        });
      }

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

      // Handle image uploads if files are provided (uploadAny puts files in req.files)
      let imageUrls: string[] = [];
      if (req.files && Array.isArray(req.files) && req.files.length > 0) {
        try {
          // Filter to only image files
          const imageFiles = req.files.filter((file: Express.Multer.File) =>
            file.mimetype.startsWith('image/')
          );

          if (imageFiles.length > 0) {
            const uploadResults = await uploadMultipleToCloudinary(imageFiles, 'service-platform/services');
            imageUrls = uploadResults.map(result => result.url);
            console.log(`Uploaded ${imageUrls.length} service images successfully`);
          }
        } catch (uploadError) {
          console.error('Error uploading service images:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload service images'
          });
        }
      }

      // Prepare service data, filtering out empty subcategoryId
      const serviceData = {
        providerId: userId,
        ...body,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        eventType: body.eventType,
        statement: body.statement,
        contractualTerms: body.contractualTerms,
        affiliateProgram: body.affiliateProgram || false,
        customerSatisfactionScore: body.customerSatisfactionScore,
        availableFrom: body.availableFrom ? new Date(body.availableFrom) : undefined,
        availableTo: body.availableTo ? new Date(body.availableTo) : undefined,
        status: ServiceStatus.PENDING // Requires admin approval
      };

      // Remove subcategoryId if it's empty
      if (!serviceData.subcategoryId || serviceData.subcategoryId === '') {
        delete serviceData.subcategoryId;
      }

      console.log('Final service data:', JSON.stringify(serviceData, null, 2));

      // Create service with all new fields
      const service = await prisma.service.create({
        data: serviceData,
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

      // Create notification for admin (find first admin user)
      try {
        const adminUser = await prisma.user.findFirst({
          where: { role: 'ADMIN', status: 'ACTIVE' },
          select: { id: true }
        });

        if (adminUser) {
          await prisma.notification.create({
            data: {
              userId: adminUser.id,
              type: 'SERVICE_SUBMITTED',
              title: 'New Service Submitted',
              message: `${service.title} submitted by ${service.provider.companyName}`,
              data: { serviceId: service.id }
            }
          });
        } else {
          console.warn('No active admin user found - skipping admin notification');
        }
      } catch (notificationError) {
        console.error('Error creating admin notification:', notificationError);
        // Don't fail the service creation if notification fails
      }

      return res.status(201).json({
        success: true,
        message: 'Service created successfully. Pending admin approval.',
        data: service
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Update service
   */
  async updateService(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      // Check ownership first
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

      // Handle image uploads if files are provided
      let imageUrls: string[] = [];
      let existingImages: string[] = [];

      // Parse form data or JSON body
      let body: any = {};
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // Handle FormData (file uploads) - parse values to correct types
        if (req.body && typeof req.body === 'object') {
          body = parseFormData(req.body);
        }

        // Handle existing images - now body.existingImages should be properly parsed
        if (body.existingImages) {
          try {
            const tempImages: string[] = Array.isArray(body.existingImages)
              ? body.existingImages.filter((item: any): item is string => typeof item === 'string')
              : [];
            existingImages = tempImages;
          } catch (e) {
            existingImages = [];
          }
        }

        // Upload new images if provided (uploadAny puts files in req.files)
        if (req.files && Array.isArray(req.files) && req.files.length > 0) {
          try {
            // Filter to only image files
            const imageFiles = req.files.filter((file: Express.Multer.File) =>
              file.mimetype.startsWith('image/')
            );

            if (imageFiles.length > 0) {
              const uploadResults = await uploadMultipleToCloudinary(imageFiles, 'service-platform/services');
              const newImageUrls = uploadResults.map(result => result.url);
              imageUrls = [...existingImages, ...newImageUrls];
              console.log(`Uploaded ${newImageUrls.length} new service images successfully`);
            } else {
              imageUrls = existingImages;
            }
          } catch (uploadError) {
            console.error('Error uploading service images:', uploadError);
            return res.status(500).json({
              success: false,
              message: 'Failed to upload service images'
            });
          }
        } else {
          // No new images, keep existing ones
          imageUrls = existingImages;
        }
      } else {
        // Handle JSON body (no file uploads)
        body = updateServiceSchema.parse(req.body);
        // Keep existing images if not specified
        const currentService = await prisma.service.findUnique({
          where: { id },
          select: { images: true }
        });
        imageUrls = (currentService?.images as string[]) || [];
      }

      // Prepare update data
      const updateData: any = {
        ...body,
        status: 'PENDING' // Require re-approval after update
      };

      // Only update images if they were provided
      if (imageUrls.length > 0 || (req.files && Array.isArray(req.files))) {
        updateData.images = imageUrls;
      }

      // Remove undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined || updateData[key] === '') {
          delete updateData[key];
        }
      });

      console.log('Updating service with data:', updateData);

      // Update service
      const updated = await prisma.service.update({
        where: { id },
        data: updateData,
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

      return res.json({
        success: true,
        message: 'Service updated successfully',
        data: updated
      });
    } catch (error) {
      console.error('Error updating service:', error);
      return next(error);
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

      // Calculate distance using Haversine formula if location provided
      if (filters.latitude && filters.longitude) {
        services = services.map(service => ({
          ...service,
          distance: service.latitude && service.longitude
            ? Math.round(calculateHaversineDistance(
                filters.latitude!,
                filters.longitude!,
                service.latitude,
                service.longitude
              ) * 100) / 100 // Round to 2 decimal places
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

      return res.json({
        success: true,
        data: service
      });
    } catch (error) {
      return next(error);
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

      return res.json({
        success: true,
        message: 'Service deleted successfully'
      });
    } catch (error) {
      return next(error);
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

      return res.json({
        success: true,
        message: 'Service rejected',
        data: service
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const serviceController = new ServiceController();