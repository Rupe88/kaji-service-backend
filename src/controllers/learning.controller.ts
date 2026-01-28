import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Validation schemas
const createCourseSchema = z.object({
  serviceId: z.string().uuid().optional(),
  title: z.string().min(5).max(200),
  description: z.string().min(20),
  detailedDescription: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  level: z.string().optional(), // Beginner, Intermediate, Advanced
  duration: z.string().optional(),
  price: z.number().min(0).optional(),
  priceType: z.enum(['FIXED', 'MONTHLY', 'PER_SESSION']).optional(),
  maxStudents: z.number().int().min(1).optional(),
  minStudents: z.number().int().min(1).default(1).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  schedule: z.record(z.any()).optional(),
  publicResourceLinks: z.array(z.string().url()).optional(),
  images: z.array(z.string().url()).optional(),
  videos: z.array(z.string().url()).optional(),
});

const createLearningMaterialSchema = z.object({
  courseId: z.string().uuid().optional(),
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  type: z.enum(['PDF', 'VIDEO', 'LINK', 'DOCUMENT', 'AUDIO']),
  fileUrl: z.string().url().optional(),
  content: z.string().optional(), // For text content
  accessLevel: z.enum(['PUBLIC', 'ENROLLED', 'PAID']).default('ENROLLED'),
  order: z.number().int().min(0).default(0).optional(),
});

const createPublicResourceSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  category: z.string().optional(),
  subject: z.string().optional(),
  resourceType: z.enum(['LINK', 'PDF', 'VIDEO', 'ARTICLE']),
  url: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});

export class LearningController {
  /**
   * Create a course
   */
  async createCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createCourseSchema.parse(req.body);

      const course = await prisma.course.create({
        data: {
          providerId: userId!,
          serviceId: body.serviceId,
          ...body,
          startDate: body.startDate ? new Date(body.startDate) : undefined,
          endDate: body.endDate ? new Date(body.endDate) : undefined,
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
        message: 'Course created successfully',
        data: course,
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
   * Get courses by provider
   */
  async getMyCourses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { page = '1', limit = '20' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where: { providerId: userId },
          include: {
            _count: {
              select: {
                enrollments: true,
                learningMaterials: true,
              },
            },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.course.count({
          where: { providerId: userId },
        }),
      ]);

      res.json({
        success: true,
        data: courses,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload learning material with encryption
   */
  async uploadLearningMaterial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createLearningMaterialSchema.parse(req.body);

      // Generate encryption key (in production, use a proper key management system)
      const encryptionKey = crypto.randomBytes(32).toString('hex');

      // Encrypt content if provided
      let encryptedContent: string | undefined;
      if (body.content) {
        const cipher = crypto.createCipher('aes-256-cbc', encryptionKey);
        encryptedContent = cipher.update(body.content, 'utf8', 'hex') + cipher.final('hex');
      }

      const material = await prisma.learningMaterial.create({
        data: {
          providerId: userId!,
          courseId: body.courseId,
          title: body.title,
          description: body.description,
          type: body.type,
          fileUrl: body.fileUrl,
          encryptedContent,
          encryptionKey, // In production, encrypt this key too
          accessLevel: body.accessLevel,
          order: body.order,
          isPublic: body.accessLevel === 'PUBLIC',
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Learning material uploaded successfully',
        data: {
          id: material.id,
          title: material.title,
          type: material.type,
          accessLevel: material.accessLevel,
          // Don't return encryption key or encrypted content
        },
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
   * Get learning material (decrypt if user has access)
   */
  async getLearningMaterial(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      const material = await prisma.learningMaterial.findUnique({
        where: { id },
        include: {
          course: {
            include: {
              enrollments: {
                where: { studentId: userId },
              },
            },
          },
        },
      });

      if (!material) {
        return res.status(404).json({
          success: false,
          message: 'Learning material not found',
        });
      }

      // Check access
      if (material.accessLevel === 'PUBLIC' || material.isPublic) {
        // Public access
      } else if (material.course && material.course.enrollments.length > 0) {
        // User is enrolled
      } else {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this material',
        });
      }

      // Decrypt content if available
      let decryptedContent: string | undefined;
      if (material.encryptedContent && material.encryptionKey) {
        try {
          const decipher = crypto.createDecipher('aes-256-cbc', material.encryptionKey);
          decryptedContent = decipher.update(material.encryptedContent, 'hex', 'utf8') + decipher.final('utf8');
        } catch (error) {
          console.error('Decryption error:', error);
        }
      }

      // Update view count
      await prisma.learningMaterial.update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      });

      return res.json({
        success: true,
        data: {
          ...material,
          content: decryptedContent || material.encryptedContent,
          encryptionKey: undefined, // Don't return key
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Create public resource
   */
  async createPublicResource(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createPublicResourceSchema.parse(req.body);

      const resource = await prisma.publicResource.create({
        data: {
          providerId: userId!,
          ...body,
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Public resource created successfully',
        data: resource,
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
   * Get public resources
   */
  async getPublicResources(req: Request, res: Response, next: NextFunction) {
    try {
      const { category, subject, page = '1', limit = '20' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {
        isActive: true,
      };

      if (category) where.category = category as string;
      if (subject) where.subject = subject as string;

      const [resources, total] = await Promise.all([
        prisma.publicResource.findMany({
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
          orderBy: { createdAt: 'desc' },
        }),
        prisma.publicResource.count({ where }),
      ]);

      res.json({
        success: true,
        data: resources,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enroll in a course
   */
  async enrollInCourse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { courseId } = req.params;

      // Check if already enrolled
      const existing = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId,
            studentId: userId!,
          },
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'You are already enrolled in this course',
        });
      }

      const enrollment = await prisma.courseEnrollment.create({
        data: {
          courseId,
          studentId: userId!,
          status: 'ACTIVE',
        },
        include: {
          course: {
            select: {
              title: true,
              price: true,
            },
          },
        },
      });

      // Update course enrollment count
      await prisma.course.update({
        where: { id: courseId },
        data: { enrollmentCount: { increment: 1 } },
      });

      return res.status(201).json({
        success: true,
        message: 'Enrolled in course successfully',
        data: enrollment,
      });
    } catch (error) {
      return next(error);
    }
  }
  /**
   * Get all courses (public browsing)
   */
  async getAllCourses(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        category,
        subject,
        level,
        page = '1',
        limit = '20',
        search
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {
        isActive: true,
      };

      if (category) where.category = category as string;
      if (subject) where.subject = subject as string;
      if (level) where.level = level as string;
      if (search) {
        where.OR = [
          { title: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [courses, total] = await Promise.all([
        prisma.course.findMany({
          where,
          include: {
            provider: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
            _count: {
              select: {
                enrollments: true,
              },
            },
          },
          skip,
          take,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.course.count({ where }),
      ]);

      res.json({
        success: true,
        data: courses,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Enroll in a course (using body for courseId)
   */
  async enrollInCourseBody(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { courseId } = req.body;

      if (!courseId) {
        return res.status(400).json({
          success: false,
          message: 'courseId is required in request body',
        });
      }

      // Check if already enrolled
      const existing = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId,
            studentId: userId!,
          },
        },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'You are already enrolled in this course',
        });
      }

      const enrollment = await prisma.courseEnrollment.create({
        data: {
          courseId,
          studentId: userId!,
          status: 'ACTIVE',
        },
        include: {
          course: {
            select: {
              title: true,
              price: true,
            },
          },
        },
      });

      // Update course enrollment count
      await prisma.course.update({
        where: { id: courseId },
        data: { enrollmentCount: { increment: 1 } },
      });

      return res.status(201).json({
        success: true,
        message: 'Enrolled in course successfully',
        data: enrollment,
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Complete an enrollment and generate a certification
   */
  async completeEnrollment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { enrollmentId } = req.params;

      const enrollment = await prisma.courseEnrollment.findUnique({
        where: { id: enrollmentId },
        include: { course: true },
      });

      if (!enrollment) {
        return res.status(404).json({ success: false, message: 'Enrollment not found' });
      }

      // Check if already completed
      if (enrollment.status === 'COMPLETED') {
        return res.status(400).json({ success: false, message: 'Course already completed' });
      }

      const updatedEnrollment = await prisma.courseEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: 'COMPLETED',
          progress: 100,
          completedAt: new Date(),
        },
      });

      // Generate Certification
      const verificationCode = `CERT-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString().slice(-4)}`;

      const certification = await (prisma as any).certification.create({
        data: {
          userId: enrollment.studentId,
          courseId: enrollment.courseId,
          title: `Certificate of Completion: ${enrollment.course.title}`,
          description: `Successfully completed the course ${enrollment.course.title}`,
          verificationCode,
        } as any,
      });

      return res.json({
        success: true,
        message: 'Enrollment completed and certification generated',
        data: {
          enrollment: updatedEnrollment,
          certification,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const learningController = new LearningController();

