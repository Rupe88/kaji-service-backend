import { Request, Response } from 'express';
import prisma from '../config/database';
import { trainingCourseSchema, enrollmentSchema, updateEnrollmentSchema } from '../utils/trainingValidation';

const createTrainingCourseSchema = trainingCourseSchema;

export const createTrainingCourse = async (req: Request, res: Response) => {
  const body = createTrainingCourseSchema.parse(req.body);

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

  res.json({
    success: true,
    data: enrollment,
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

