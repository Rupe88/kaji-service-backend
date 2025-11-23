import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { trainingCourseSchema, enrollmentSchema, updateEnrollmentSchema, updateTrainingCourseSchema } from '../utils/trainingValidation';
import { awardCoins, calculateTrainingReward } from '../services/coinReward.service';

const createTrainingCourseSchema = trainingCourseSchema;

export const createTrainingCourse = async (req: AuthRequest, res: Response) => {
  // Check authentication
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Only Industrial users can create courses
  if (req.user.role !== 'INDUSTRIAL') {
    res.status(403).json({
      success: false,
      message: 'Only industrial users (training providers) can create courses',
    });
    return;
  }

  const body = createTrainingCourseSchema.parse(req.body);

  // Verify providerId matches authenticated user
  if (body.providerId !== req.user.id) {
    res.status(403).json({
      success: false,
      message: 'You can only create courses for your own account',
    });
    return;
  }

  // Verify user has approved Industrial KYC
  const industrialKYC = await prisma.industrialKYC.findUnique({
    where: { userId: req.user.id },
  });

  if (!industrialKYC || industrialKYC.status !== 'APPROVED') {
    res.status(403).json({
      success: false,
      message: 'Your industrial KYC must be approved to create training courses',
    });
    return;
  }

  const course = await prisma.trainingCourse.create({
    data: {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    },
  });

  res.status(201).json({
    success: true,
    data: course,
  });
};

export const getTrainingCourse = async (req: Request, res: Response) => {
  const { id } = req.params;

  const course = await prisma.trainingCourse.findUnique({
    where: { id },
    include: {
      enrollments: {
        include: {
          individual: {
            select: {
              userId: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!course) {
    res.status(404).json({
      success: false,
      message: 'Training course not found',
    });
    return;
  }

  res.json({
    success: true,
    data: course,
  });
};

export const getAllTrainingCourses = async (req: Request, res: Response) => {
  const { providerId, category, mode, isActive, search, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (providerId) where.providerId = providerId;
  if (category) where.category = category;
  if (mode) where.mode = mode;
  if (isActive !== undefined) where.isActive = isActive === 'true';
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const [courses, total] = await Promise.all([
    prisma.trainingCourse.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: {
            enrollments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.trainingCourse.count({ where }),
  ]);

  res.json({
    success: true,
    data: courses,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const enrollInTraining = async (req: Request, res: Response) => {
  const body = enrollmentSchema.parse(req.body);
  const { courseId, userId } = body;

  // Check if course exists and has available seats
  const course = await prisma.trainingCourse.findUnique({
    where: { id: courseId },
  });

  if (!course) {
    res.status(404).json({
      success: false,
      message: 'Training course not found',
    });
    return;
  }

  // Prevent course creator from enrolling in their own course
  if (course.providerId === userId) {
    res.status(403).json({
      success: false,
      message: 'You cannot enroll in your own course',
    });
    return;
  }

  if (!course.isActive) {
    res.status(400).json({
      success: false,
      message: 'Course is not active',
    });
    return;
  }

  if (course.seats && course.bookedSeats >= course.seats) {
    res.status(400).json({
      success: false,
      message: 'No seats available',
    });
    return;
  }

  // Check if already enrolled
  const existingEnrollment = await prisma.trainingEnrollment.findUnique({
    where: {
      courseId_userId: {
        courseId,
        userId,
      },
    },
  });

  if (existingEnrollment) {
    res.status(409).json({
      success: false,
      message: 'Already enrolled in this course',
    });
    return;
  }

  // Create enrollment and update booked seats
  const [enrollment] = await Promise.all([
    prisma.trainingEnrollment.create({
      data: {
        courseId,
        userId,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
      },
      include: {
        course: true,
        individual: {
          select: {
            userId: true,
            fullName: true,
            email: true,
          },
        },
      },
    }),
    prisma.trainingCourse.update({
      where: { id: courseId },
      data: {
        bookedSeats: { increment: 1 },
      },
    }),
  ]);

  res.status(201).json({
    success: true,
    data: enrollment,
  });
};

export const updateEnrollmentProgress = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = updateEnrollmentSchema.parse(req.body);
  const { progress, practiceHours, practiceVideos, practicePhotos, status } = body;

  // Get current enrollment to check if status is changing to COMPLETED
  const currentEnrollment = await prisma.trainingEnrollment.findUnique({
    where: { id },
    include: { course: true },
  });

  if (!currentEnrollment) {
    res.status(404).json({
      success: false,
      message: 'Enrollment not found',
    });
    return;
  }

  const isCompleting = status === 'COMPLETED' && currentEnrollment.status !== 'COMPLETED';

  const enrollment = await prisma.trainingEnrollment.update({
    where: { id },
    data: {
      progress,
      practiceHours,
      practiceVideos,
      practicePhotos,
      status,
      completedAt: status === 'COMPLETED' ? new Date() : undefined,
    },
    include: {
      course: true,
      individual: true,
    },
  });

  // Award coins automatically when course is completed
  if (isCompleting && enrollment.course && enrollment.userId) {
    const courseDuration = enrollment.course.duration || 1;
    const coinsToAward = calculateTrainingReward(courseDuration);

    const coinResult = await awardCoins({
      userId: enrollment.userId,
      amount: coinsToAward,
      source: 'TRAINING_COMPLETION',
      sourceId: enrollment.courseId,
      description: `Completed training course: ${enrollment.course.title}`,
    });

    if (coinResult.success) {
      console.log(`✅ Awarded ${coinsToAward} coins to user ${enrollment.userId} for completing course ${enrollment.course.title}`);
    } else {
      console.error(`❌ Failed to award coins: ${coinResult.error}`);
    }
  }

  res.json({
    success: true,
    data: enrollment,
    coinsAwarded: isCompleting && enrollment.course ? calculateTrainingReward(enrollment.course.duration || 1) : undefined,
  });
};

export const getEnrollments = async (req: Request, res: Response) => {
  const { userId, courseId, status, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (userId) where.userId = userId;
  if (courseId) where.courseId = courseId;
  if (status) where.status = status;

  const [enrollments, total] = await Promise.all([
    prisma.trainingEnrollment.findMany({
      where,
      skip,
      take,
      include: {
        course: true,
        individual: {
          select: {
            userId: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { enrolledAt: 'desc' },
    }),
    prisma.trainingEnrollment.count({ where }),
  ]);

  res.json({
    success: true,
    data: enrollments,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const updateTrainingCourse = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Get course first
  const course = await prisma.trainingCourse.findUnique({
    where: { id },
  });

  if (!course) {
    res.status(404).json({
      success: false,
      message: 'Course not found',
    });
    return;
  }

  // Allow ADMIN to update any course, or INDUSTRIAL to update their own
  if (req.user.role === 'ADMIN') {
    // Admin can update any course
  } else if (req.user.role === 'INDUSTRIAL') {
    if (course.providerId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only update your own courses',
      });
      return;
    }
  } else {
    res.status(403).json({
      success: false,
      message: 'Only industrial users or admins can update courses',
    });
    return;
  }

  const body = updateTrainingCourseSchema.parse(req.body);

  const updated = await prisma.trainingCourse.update({
    where: { id },
    data: {
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    },
  });

  res.json({
    success: true,
    data: updated,
  });
};

export const deleteTrainingCourse = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Get course first
  const course = await prisma.trainingCourse.findUnique({
    where: { id },
  });

  if (!course) {
    res.status(404).json({
      success: false,
      message: 'Course not found',
    });
    return;
  }

  // Allow ADMIN to delete any course, or INDUSTRIAL to delete their own
  if (req.user.role === 'ADMIN') {
    // Admin can delete any course
  } else if (req.user.role === 'INDUSTRIAL') {
    if (course.providerId !== req.user.id) {
      res.status(403).json({
        success: false,
        message: 'You can only delete your own courses',
      });
      return;
    }
  } else {
    res.status(403).json({
      success: false,
      message: 'Only industrial users or admins can delete courses',
    });
    return;
  }

  await prisma.trainingCourse.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Course deleted successfully',
  });
};

