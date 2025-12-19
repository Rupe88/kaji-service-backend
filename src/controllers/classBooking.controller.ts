import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

const createClassBookingSchema = z.object({
  courseId: z.string().uuid(),
  classDate: z.string().datetime(),
  classTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  duration: z.string().optional(),
  location: z.string().optional(),
  isOnline: z.boolean().default(false),
  meetingLink: z.string().url().optional(),
  notes: z.string().optional(),
});

export class ClassBookingController {
  /**
   * Book a class
   */
  async bookClass(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const body = createClassBookingSchema.parse(req.body);

      // Check if user is enrolled in the course
      const enrollment = await prisma.courseEnrollment.findUnique({
        where: {
          courseId_studentId: {
            courseId: body.courseId,
            studentId: userId!,
          },
        },
      });

      if (!enrollment) {
        return res.status(403).json({
          success: false,
          message: 'You must be enrolled in the course to book a class',
        });
      }

      const classBooking = await prisma.classBooking.create({
        data: {
          courseId: body.courseId,
          studentId: userId!,
          classDate: new Date(body.classDate),
          classTime: body.classTime,
          duration: body.duration,
          location: body.location,
          isOnline: body.isOnline,
          meetingLink: body.isOnline ? body.meetingLink : undefined,
          notes: body.notes,
          status: 'SCHEDULED',
        },
        include: {
          course: {
            select: {
              title: true,
              provider: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: 'Class booked successfully',
        data: classBooking,
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
   * Get class bookings for a student
   */
  async getMyClassBookings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { status, page = '1', limit = '20' } = req.query;
      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const where: any = {
        studentId: userId,
      };

      if (status) {
        where.status = status as string;
      }

      const [bookings, total] = await Promise.all([
        prisma.classBooking.findMany({
          where,
          include: {
            course: {
              select: {
                title: true,
                provider: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
          skip,
          take,
          orderBy: { classDate: 'asc' },
        }),
        prisma.classBooking.count({ where }),
      ]);

      res.json({
        success: true,
        data: bookings,
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
   * Update class booking status (provider or student)
   */
  async updateClassBookingStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { status, attendance, notes } = req.body;

      const booking = await prisma.classBooking.findUnique({
        where: { id },
        include: {
          course: {
            select: {
              providerId: true,
            },
          },
        },
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: 'Class booking not found',
        });
      }

      // Check authorization
      const isProvider = booking.course.providerId === userId;
      const isStudent = booking.studentId === userId;

      if (!isProvider && !isStudent) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to update this booking',
        });
      }

      const updateData: any = {};
      if (status) updateData.status = status;
      if (attendance !== undefined && isProvider) updateData.attendance = attendance;
      if (notes) updateData.notes = notes;

      if (status === 'COMPLETED') {
        updateData.attendance = attendance ?? true;
      }

      const updated = await prisma.classBooking.update({
        where: { id },
        data: updateData,
        include: {
          course: {
            select: {
              title: true,
            },
          },
        },
      });

      return res.json({
        success: true,
        message: 'Class booking updated successfully',
        data: updated,
      });
    } catch (error) {
      return next(error);
    }
  }
}

export const classBookingController = new ClassBookingController();

