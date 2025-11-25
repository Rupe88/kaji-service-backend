import { Request, Response } from 'express';
import prisma from '../config/database';
import { uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';
import { examSchema, examBookingSchema, updateExamBookingSchema } from '../utils/examValidation';
import { getSocketIOInstance, emitNotification } from '../config/socket';
import emailService from '../services/email.service';

const createExamSchema = examSchema;

export const createExam = async (req: Request, res: Response) => {
  const body = createExamSchema.parse(req.body);

  const exam = await prisma.exam.create({
    data: body,
  });

  res.status(201).json({
    success: true,
    data: exam,
  });
};

export const getExam = async (req: Request, res: Response) => {
  const { id } = req.params;

  const exam = await prisma.exam.findUnique({
    where: { id },
    include: {
      bookings: {
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

  if (!exam) {
    res.status(404).json({
      success: false,
      message: 'Exam not found',
    });
    return;
  }

  res.json({
    success: true,
    data: exam,
  });
};

export const updateExam = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  // Check if exam exists
  const existingExam = await prisma.exam.findUnique({
    where: { id },
  });

  if (!existingExam) {
    res.status(404).json({
      success: false,
      message: 'Exam not found',
    });
    return;
  }

  // Parse and validate update data (all fields optional for update)
  const updateData: any = {};
  if (req.body.title !== undefined) updateData.title = req.body.title;
  if (req.body.description !== undefined) updateData.description = req.body.description;
  if (req.body.category !== undefined) updateData.category = req.body.category;
  if (req.body.mode !== undefined) updateData.mode = req.body.mode;
  if (req.body.duration !== undefined) updateData.duration = parseInt(req.body.duration);
  if (req.body.passingScore !== undefined) updateData.passingScore = parseInt(req.body.passingScore);
  if (req.body.totalMarks !== undefined) updateData.totalMarks = parseInt(req.body.totalMarks);
  if (req.body.examFee !== undefined) updateData.examFee = parseFloat(req.body.examFee);
  if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive === true || req.body.isActive === 'true';
  if (req.body.courseId !== undefined) updateData.courseId = req.body.courseId || null;

  // Validate using schema if all required fields are present
  if (updateData.title || updateData.description || updateData.category || updateData.mode || updateData.duration || updateData.passingScore || updateData.totalMarks || updateData.examFee !== undefined) {
    const fullData = {
      title: updateData.title || existingExam.title,
      description: updateData.description || existingExam.description,
      category: updateData.category || existingExam.category,
      mode: updateData.mode || existingExam.mode,
      duration: updateData.duration || existingExam.duration,
      passingScore: updateData.passingScore || existingExam.passingScore,
      totalMarks: updateData.totalMarks || existingExam.totalMarks,
      examFee: updateData.examFee !== undefined ? updateData.examFee : parseFloat(existingExam.examFee.toString()),
    };
    createExamSchema.parse(fullData);
  }

  const exam = await prisma.exam.update({
    where: { id },
    data: updateData,
  });

  res.json({
    success: true,
    data: exam,
  });
};

export const deleteExam = async (req: Request, res: Response) => {
  const { id } = req.params;

  // Check if exam has bookings
  const bookingsCount = await prisma.examBooking.count({
    where: { examId: id },
  });

  if (bookingsCount > 0) {
    res.status(400).json({
      success: false,
      message: `Cannot delete exam. It has ${bookingsCount} booking(s).`,
    });
    return;
  }

  await prisma.exam.delete({
    where: { id },
  });

  res.json({
    success: true,
    message: 'Exam deleted successfully',
  });
};

export const getAllExams = async (req: Request, res: Response) => {
  const { category, mode, isActive, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (category) where.category = category;
  if (mode) where.mode = mode;
  if (isActive !== undefined) where.isActive = isActive === 'true';

  const [exams, total] = await Promise.all([
    prisma.exam.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.exam.count({ where }),
  ]);

  res.json({
    success: true,
    data: exams,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const bookExam = async (req: Request, res: Response) => {
  const body = examBookingSchema.parse(req.body);
  const { examId, userId, examDate, interviewDate } = body;

  // Verify exam exists
  const exam = await prisma.exam.findUnique({
    where: { id: examId },
  });

  if (!exam) {
    res.status(404).json({
      success: false,
      message: 'Exam not found',
    });
    return;
  }

  if (!exam.isActive) {
    res.status(400).json({
      success: false,
      message: 'Exam is not active',
    });
    return;
  }

  // Verify user exists
  const user = await prisma.individualKYC.findUnique({
    where: { userId },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  // Set default exam date to 7 days from now if not provided
  const defaultExamDate = examDate 
    ? new Date(examDate) 
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

  // Validate that exam date is in the future
  if (defaultExamDate < new Date()) {
    res.status(400).json({
      success: false,
      message: 'Exam date must be in the future',
    });
    return;
  }

  // Check if user already has a booking for this exam
  const existingBooking = await prisma.examBooking.findFirst({
    where: {
      examId,
      userId,
    },
  });

  if (existingBooking) {
    res.status(400).json({
      success: false,
      message: 'You have already booked this exam',
    });
    return;
  }

  const booking = await prisma.examBooking.create({
    data: {
      examId,
      userId,
      bookedDate: new Date(),
      examDate: defaultExamDate,
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
    },
    include: {
      exam: true,
      individual: {
        select: {
          userId: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  // Send notification to user about successful booking
  const io = getSocketIOInstance();
  if (io) {
    const examDateFormatted = defaultExamDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    await emitNotification(io, userId, {
      type: 'EXAM_BOOKING',
      title: 'Exam Booked Successfully! 📝',
      message: `You have successfully booked "${booking.exam.title}". Exam date: ${examDateFormatted}`,
      data: {
        bookingId: booking.id,
        examId: booking.exam.id,
        examTitle: booking.exam.title,
        examDate: defaultExamDate.toISOString(),
        status: booking.status,
      },
    });
    console.log(`📬 Socket.io: Exam booking notification sent to user ${userId}`);
  }

  res.status(201).json({
    success: true,
    data: booking,
  });
};

export const updateExamBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const body = updateExamBookingSchema.parse(req.body);
  const { status, score, examVideos, examPhotos, interviewVideos, interviewPhotos } = body;

  // Handle file uploads if provided
  const files = req.files as Express.Multer.File[] | undefined;
  let uploadedVideos: string[] = [];
  let uploadedPhotos: string[] = [];

  if (files && files.length > 0) {
    const uploadResults = await uploadMultipleToCloudinary(files, 'hr-platform/exams');
    uploadResults.forEach((result) => {
      if (result.resourceType === 'video') {
        uploadedVideos.push(result.url);
      } else {
        uploadedPhotos.push(result.url);
      }
    });
  }

  const updateData: any = {
    status,
    score,
    resultDate: status === 'PASSED' || status === 'FAILED' ? new Date() : undefined,
  };

  if (examVideos || uploadedVideos.length > 0) {
    updateData.examVideos = examVideos || uploadedVideos;
  }
  if (examPhotos || uploadedPhotos.length > 0) {
    updateData.examPhotos = examPhotos || uploadedPhotos;
  }
  if (interviewVideos) updateData.interviewVideos = interviewVideos;
  if (interviewPhotos) updateData.interviewPhotos = interviewPhotos;

  const booking = await prisma.examBooking.update({
    where: { id },
    data: updateData,
    include: {
      exam: true,
      individual: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
      },
    },
  });

  // Send notification if status changed to PASSED or FAILED
  const io = getSocketIOInstance();
  if (io && (status === 'PASSED' || status === 'FAILED') && booking.individual?.user) {
    const title = status === 'PASSED' ? 'Exam Passed! 🎉' : 'Exam Result Available';
    const message = status === 'PASSED'
      ? `Congratulations! You passed "${booking.exam.title}"`
      : `Your exam result for "${booking.exam.title}" is now available.`;

    await emitNotification(io, booking.individual.userId, {
      type: 'EXAM_RESULT',
      title,
      message,
      data: {
        bookingId: booking.id,
        examId: booking.exam.id,
        examTitle: booking.exam.title,
        status,
        score: booking.score || undefined,
        totalMarks: booking.exam.totalMarks,
        passingScore: booking.exam.passingScore,
      },
    });

    // Send email notification (async, don't wait)
    if (booking.individual.user.email) {
      emailService.sendExamResultEmail(
        {
          email: booking.individual.user.email,
          firstName: booking.individual.user.firstName || undefined,
        },
        {
          examTitle: booking.exam.title,
          status,
          score: booking.score || undefined,
          totalMarks: booking.exam.totalMarks,
          passingScore: booking.exam.passingScore,
          bookingId: booking.id,
          examId: booking.exam.id,
        }
      ).catch((error) => {
        console.error('Error sending exam result email:', error);
      });
    }
  }

  res.json({
    success: true,
    data: booking,
  });
};

export const requestRetotaling = async (req: Request, res: Response) => {
  const { id } = req.params;

  const booking = await prisma.examBooking.update({
    where: { id },
    data: {
      status: 'RETOTALING_REQUESTED',
      retotalingRequested: true,
    },
  });

  res.json({
    success: true,
    data: booking,
  });
};

export const getExamBookings = async (req: Request, res: Response) => {
  const { userId, examId, status, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (userId) where.userId = userId;
  if (examId) where.examId = examId;
  if (status) where.status = status;

  const [bookings, total] = await Promise.all([
    prisma.examBooking.findMany({
      where,
      skip,
      take,
      include: {
        exam: true,
        individual: {
          select: {
            userId: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { bookedDate: 'desc' },
    }),
    prisma.examBooking.count({ where }),
  ]);

  res.json({
    success: true,
    data: bookings,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

