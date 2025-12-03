import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import {
  urgentJobSchema,
  urgentJobApplicationSchema,
  updateUrgentJobSchema,
  urgentJobsQuerySchema,
} from '../utils/urgentJobValidation';
import { findNearbyJobs, getBoundingBox, isValidCoordinates } from '../services/location.service';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { AuthRequest } from '../middleware/auth';
import { notifyNearbyUsersAboutUrgentJob } from '../services/urgentJobNotification.service';

/**
 * Create a new urgent job
 * Anyone can post (no KYC required)
 */
export const createUrgentJob = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    // Parse FormData fields
    const parsedBody: any = { ...req.body };
    parsedBody.posterId = req.user.id;

    // Parse number fields
    const numberFields = ['paymentAmount', 'maxWorkers', 'latitude', 'longitude'];
    for (const field of numberFields) {
      if (parsedBody[field] !== undefined && parsedBody[field] !== null && parsedBody[field] !== '') {
        parsedBody[field] = parseFloat(parsedBody[field]);
      }
    }

    // Parse integer fields
    if (parsedBody.maxWorkers) {
      parsedBody.maxWorkers = parseInt(parsedBody.maxWorkers);
    }

    // Validate
    const body = urgentJobSchema.parse(parsedBody);

    // Handle image upload if provided
    let imageUrl: string | undefined;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file, 'hr-platform/urgent-jobs');
        imageUrl = uploadResult.url;
      } catch (error: any) {
        console.error('Error uploading urgent job image:', error);
        // Continue without image if upload fails
      }
    }

    // Create urgent job
    const urgentJob = await prisma.urgentJob.create({
      data: {
        posterId: body.posterId,
        title: body.title,
        description: body.description,
        category: body.category,
        province: body.province,
        district: body.district,
        city: body.city,
        ward: body.ward,
        street: body.street,
        latitude: body.latitude,
        longitude: body.longitude,
        paymentAmount: body.paymentAmount,
        paymentType: body.paymentType,
        urgencyLevel: body.urgencyLevel,
        maxWorkers: body.maxWorkers,
        startTime: new Date(body.startTime),
        endTime: body.endTime ? new Date(body.endTime) : null,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        contactPhone: body.contactPhone,
        contactMethod: body.contactMethod,
        imageUrl: imageUrl,
        status: 'OPEN',
        currentWorkers: 0,
      },
      include: {
        poster: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
          },
        },
        applications: {
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    // Notify nearby users (within 10km) about the new urgent job
    // Run this asynchronously so it doesn't block the response
    notifyNearbyUsersAboutUrgentJob({
      id: urgentJob.id,
      title: urgentJob.title,
      description: urgentJob.description,
      category: urgentJob.category,
      paymentAmount: urgentJob.paymentAmount.toNumber(),
      paymentType: urgentJob.paymentType,
      urgencyLevel: urgentJob.urgencyLevel,
      latitude: urgentJob.latitude,
      longitude: urgentJob.longitude,
      province: urgentJob.province,
      district: urgentJob.district,
      city: urgentJob.city,
      ward: urgentJob.ward,
      street: urgentJob.street,
      startTime: urgentJob.startTime,
      contactPhone: urgentJob.contactPhone,
      posterId: urgentJob.posterId,
      poster: urgentJob.poster,
    }).catch((error) => {
      // Log error but don't fail the request
      console.error('Error notifying nearby users about urgent job:', error);
    });

    res.status(201).json({
      success: true,
      data: urgentJob,
      message: 'Urgent job created successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error creating urgent job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create urgent job',
    });
  }
};

/**
 * Get all urgent jobs with filters
 */
export const getUrgentJobs = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const query = urgentJobsQuerySchema.parse(req.query);
    
    const where: any = {
      status: query.status || 'OPEN',
    };

    if (query.category) {
      where.category = query.category;
    }

    if (query.urgencyLevel) {
      where.urgencyLevel = query.urgencyLevel;
    }

    if (query.province) {
      where.province = query.province;
    }

    if (query.district) {
      where.district = query.district;
    }

    if (query.city) {
      where.city = query.city;
    }

    if (query.paymentType) {
      where.paymentType = query.paymentType;
    }

    if (query.minPayment !== undefined) {
      where.paymentAmount = { ...where.paymentAmount, gte: query.minPayment };
    }

    if (query.maxPayment !== undefined) {
      where.paymentAmount = { ...where.paymentAmount, lte: query.maxPayment };
    }

    // Location-based filtering
    if (query.latitude && query.longitude && isValidCoordinates(query.latitude, query.longitude)) {
      const radius = query.radius || 50; // Default 50km
      const bbox = getBoundingBox(query.latitude, query.longitude, radius);
      
      where.latitude = {
        gte: bbox.minLat,
        lte: bbox.maxLat,
      };
      where.longitude = {
        gte: bbox.minLon,
        lte: bbox.maxLon,
      };
    }

    // Filter out expired jobs
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ];

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Get jobs
    const [jobs, total] = await Promise.all([
      prisma.urgentJob.findMany({
        where,
        include: {
          poster: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
              individualKYC: {
                select: {
                  status: true,
                },
              },
              industrialKYC: {
                select: {
                  status: true,
                },
              },
            },
          },
          applications: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: getOrderBy(query.sortBy),
      }),
      prisma.urgentJob.count({ where }),
    ]);

    // Calculate distances if location provided
    let jobsWithDistance = jobs;
    if (query.latitude && query.longitude && isValidCoordinates(query.latitude, query.longitude)) {
      jobsWithDistance = findNearbyJobs(
        query.latitude,
        query.longitude,
        jobs,
        query.radius || 50
      );
    }

    // Add verification status and sort by verified first (if not already sorted by urgency)
    const jobsWithVerification = jobsWithDistance.map((job: any) => {
      const isVerified = 
        (job.poster?.individualKYC?.status === 'APPROVED') ||
        (job.poster?.industrialKYC?.status === 'APPROVED');
      return {
        ...job,
        isVerified,
      };
    });

    // Sort by verified status first (unless sorting by urgency or other specific criteria)
    if (query.sortBy === 'newest' || query.sortBy === 'oldest' || !query.sortBy) {
      jobsWithVerification.sort((a: any, b: any) => {
        if (a.isVerified && !b.isVerified) return -1;
        if (!a.isVerified && b.isVerified) return 1;
        return 0; // Keep original order for verified items
      });
    }

    res.json({
      success: true,
      data: jobsWithVerification,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error fetching urgent jobs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch urgent jobs',
    });
  }
};

/**
 * Get nearby urgent jobs (location-based)
 */
export const getNearbyUrgentJobs = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { latitude, longitude, radius = 50 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required',
      });
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);
    const radiusKm = parseFloat(radius as string);

    if (!isValidCoordinates(lat, lon)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinates',
      });
    }

    const bbox = getBoundingBox(lat, lon, radiusKm);

    const jobs = await prisma.urgentJob.findMany({
      where: {
        status: 'OPEN',
        latitude: {
          gte: bbox.minLat,
          lte: bbox.maxLat,
        },
        longitude: {
          gte: bbox.minLon,
          lte: bbox.maxLon,
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      include: {
        poster: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            individualKYC: {
              select: {
                status: true,
              },
            },
            industrialKYC: {
              select: {
                status: true,
              },
            },
          },
        },
        applications: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    // Calculate exact distances and filter
    const nearbyJobs = findNearbyJobs(lat, lon, jobs, radiusKm);

    // Add verification status
    const jobsWithVerification = nearbyJobs.map((job: any) => {
      const isVerified = 
        (job.poster?.individualKYC?.status === 'APPROVED') ||
        (job.poster?.industrialKYC?.status === 'APPROVED');
      return {
        ...job,
        isVerified,
      };
    });

    res.json({
      success: true,
      data: jobsWithVerification,
    });
  } catch (error: any) {
    console.error('Error fetching nearby urgent jobs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch nearby urgent jobs',
    });
  }
};

/**
 * Get single urgent job by ID
 */
export const getUrgentJobById = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { id } = req.params;

    const urgentJob = await prisma.urgentJob.findUnique({
      where: { id },
      include: {
        poster: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            profileImage: true,
            individualKYC: {
              select: {
                status: true,
              },
            },
            industrialKYC: {
              select: {
                status: true,
              },
            },
          },
        },
        applications: {
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                phone: true,
              },
            },
          },
          orderBy: {
            appliedAt: 'desc',
          },
        },
      },
    });

    if (!urgentJob) {
      return res.status(404).json({
        success: false,
        message: 'Urgent job not found',
      });
    }

    // Add verification status
    const isVerified = 
      (urgentJob.poster?.individualKYC?.status === 'APPROVED') ||
      (urgentJob.poster?.industrialKYC?.status === 'APPROVED');

    res.json({
      success: true,
      data: {
        ...urgentJob,
        isVerified,
      },
    });
  } catch (error: any) {
    console.error('Error fetching urgent job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch urgent job',
    });
  }
};

/**
 * Update urgent job
 */
export const updateUrgentJob = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Check if job exists and user is the poster
    const existingJob = await prisma.urgentJob.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Urgent job not found',
      });
    }

    if (existingJob.posterId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own urgent jobs',
      });
    }

    // Parse FormData fields
    const parsedBody: any = { ...req.body };

    // Parse number fields
    const numberFields = ['paymentAmount', 'maxWorkers', 'latitude', 'longitude'];
    for (const field of numberFields) {
      if (parsedBody[field] !== undefined && parsedBody[field] !== null && parsedBody[field] !== '') {
        parsedBody[field] = parseFloat(parsedBody[field]);
      }
    }

    if (parsedBody.maxWorkers) {
      parsedBody.maxWorkers = parseInt(parsedBody.maxWorkers);
    }

    // Validate
    const body = updateUrgentJobSchema.parse(parsedBody);

    // Handle image upload if provided
    let imageUrl = existingJob.imageUrl;
    if (req.file) {
      try {
        const uploadResult = await uploadToCloudinary(req.file, 'hr-platform/urgent-jobs');
        imageUrl = uploadResult.url;
      } catch (error: any) {
        console.error('Error uploading urgent job image:', error);
      }
    }

    // Update job
    const updatedJob = await prisma.urgentJob.update({
      where: { id },
      data: {
        ...body,
        imageUrl,
        startTime: body.startTime ? new Date(body.startTime) : undefined,
        endTime: body.endTime !== undefined ? (body.endTime ? new Date(body.endTime) : null) : undefined,
        expiresAt: body.expiresAt !== undefined ? (body.expiresAt ? new Date(body.expiresAt) : null) : undefined,
      },
      include: {
        poster: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
        applications: {
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedJob,
      message: 'Urgent job updated successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error updating urgent job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update urgent job',
    });
  }
};

/**
 * Delete urgent job
 */
export const deleteUrgentJob = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Check if job exists and user is the poster
    const existingJob = await prisma.urgentJob.findUnique({
      where: { id },
    });

    if (!existingJob) {
      return res.status(404).json({
        success: false,
        message: 'Urgent job not found',
      });
    }

    if (existingJob.posterId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own urgent jobs',
      });
    }

    await prisma.urgentJob.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Urgent job deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting urgent job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete urgent job',
    });
  }
};

/**
 * Apply to urgent job
 */
export const applyToUrgentJob = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const body = urgentJobApplicationSchema.parse({
      jobId: id,
      applicantId: req.user.id,
    });

    // Check if job exists and is open
    const job = await prisma.urgentJob.findUnique({
      where: { id: body.jobId },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Urgent job not found',
      });
    }

    if (job.status !== 'OPEN') {
      return res.status(400).json({
        success: false,
        message: 'This urgent job is no longer accepting applications',
      });
    }

    if (job.currentWorkers >= job.maxWorkers) {
      return res.status(400).json({
        success: false,
        message: 'This urgent job has reached maximum workers',
      });
    }

    // Check if already applied
    const existingApplication = await prisma.urgentJobApplication.findUnique({
      where: {
        jobId_applicantId: {
          jobId: body.jobId,
          applicantId: body.applicantId,
        },
      },
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied to this urgent job',
      });
    }

    // Create application
    const application = await prisma.urgentJobApplication.create({
      data: {
        jobId: body.jobId,
        applicantId: body.applicantId,
        status: 'PENDING',
      },
      include: {
        job: {
          include: {
            poster: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        applicant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: application,
      message: 'Application submitted successfully',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error applying to urgent job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to apply to urgent job',
    });
  }
};

/**
 * Accept application
 */
export const acceptApplication = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { id, applicationId } = req.params;

    // Check if job exists and user is the poster
    const job = await prisma.urgentJob.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Urgent job not found',
      });
    }

    if (job.posterId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the job poster can accept applications',
      });
    }

    // Check if job is still open
    if (job.status !== 'OPEN' && job.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        message: 'Cannot accept applications for this job status',
      });
    }

    // Check if max workers reached
    if (job.currentWorkers >= job.maxWorkers) {
      return res.status(400).json({
        success: false,
        message: 'Maximum workers reached for this job',
      });
    }

    // Check if application exists
    const application = await prisma.urgentJobApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application || application.jobId !== id) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
      });
    }

    if (application.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Application is not in pending status',
      });
    }

    // Accept application and update job
    const [updatedApplication] = await Promise.all([
      prisma.urgentJobApplication.update({
        where: { id: applicationId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
        include: {
          applicant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profileImage: true,
            },
          },
        },
      }),
      prisma.urgentJob.update({
        where: { id },
        data: {
          currentWorkers: { increment: 1 },
          status: job.currentWorkers + 1 >= job.maxWorkers ? 'IN_PROGRESS' : job.status,
        },
      }),
    ]);

    res.json({
      success: true,
      data: updatedApplication,
      message: 'Application accepted successfully',
    });
  } catch (error: any) {
    console.error('Error accepting application:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to accept application',
    });
  }
};

/**
 * Complete urgent job
 */
export const completeJob = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Check if job exists and user is the poster
    const job = await prisma.urgentJob.findUnique({
      where: { id },
    });

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Urgent job not found',
      });
    }

    if (job.posterId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the job poster can mark job as completed',
      });
    }

    // Update job status
    const updatedJob = await prisma.urgentJob.update({
      where: { id },
      data: {
        status: 'COMPLETED',
      },
      include: {
        applications: {
          where: {
            status: 'ACCEPTED',
          },
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      success: true,
      data: updatedJob,
      message: 'Job marked as completed',
    });
  } catch (error: any) {
    console.error('Error completing job:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete job',
    });
  }
};

/**
 * Get my urgent jobs (posted by user)
 */
export const getMyUrgentJobs = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const jobs = await prisma.urgentJob.findMany({
      where: {
        posterId: req.user.id,
      },
      include: {
        applications: {
          include: {
            applicant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: jobs,
    });
  } catch (error: any) {
    console.error('Error fetching my urgent jobs:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch your urgent jobs',
    });
  }
};

/**
 * Get my applications
 */
export const getMyApplications = async (req: AuthRequest, res: Response): Promise<Response | void> => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const applications = await prisma.urgentJobApplication.findMany({
      where: {
        applicantId: req.user.id,
      },
      include: {
        job: {
          include: {
            poster: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profileImage: true,
                individualKYC: {
                  select: {
                    status: true,
                  },
                },
                industrialKYC: {
                  select: {
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });

    // Add verification status to jobs
    const applicationsWithVerification = applications.map((app: any) => {
      const isVerified = 
        (app.job?.poster?.individualKYC?.status === 'APPROVED') ||
        (app.job?.poster?.industrialKYC?.status === 'APPROVED');
      return {
        ...app,
        job: {
          ...app.job,
          isVerified,
        },
      };
    });

    res.json({
      success: true,
      data: applicationsWithVerification,
    });
  } catch (error: any) {
    console.error('Error fetching my applications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch your applications',
    });
  }
};

/**
 * Helper function to get order by clause
 */
function getOrderBy(sortBy?: string): any {
  switch (sortBy) {
    case 'oldest':
      return { createdAt: 'asc' as const };
    case 'payment-high':
      return { paymentAmount: 'desc' as const };
    case 'payment-low':
      return { paymentAmount: 'asc' as const };
    case 'urgency':
      return [
        { urgencyLevel: 'asc' as const }, // IMMEDIATE, TODAY, WITHIN_HOURS
        { startTime: 'asc' as const },
      ];
    case 'newest':
    default:
      return { createdAt: 'desc' as const };
  }
}

