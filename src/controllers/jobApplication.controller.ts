import { Request, Response } from 'express';
import prisma from '../config/database';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { jobApplicationSchema } from '../utils/jobValidation';

const createJobApplicationSchema = jobApplicationSchema;

export const createJobApplication = async (req: Request, res: Response) => {
  const body = createJobApplicationSchema.parse(req.body);

  // Verify job exists and is active
  const job = await prisma.jobPosting.findUnique({
    where: { id: body.jobId },
  });

  if (!job) {
    res.status(404).json({
      success: false,
      message: 'Job posting not found',
    });
    return;
  }

  if (!job.isActive) {
    res.status(400).json({
      success: false,
      message: 'Job posting is no longer active',
    });
    return;
  }

  // Check if already applied
  const existingApplication = await prisma.jobApplication.findUnique({
    where: {
      jobId_applicantId: {
        jobId: body.jobId,
        applicantId: body.applicantId,
      },
    },
  });

  if (existingApplication) {
    res.status(409).json({
      success: false,
      message: 'You have already applied for this job',
    });
    return;
  }

  // Verify applicant exists
  const applicant = await prisma.individualKYC.findUnique({
    where: { userId: body.applicantId },
  });

  if (!applicant) {
    res.status(404).json({
      success: false,
      message: 'Applicant profile not found',
    });
    return;
  }

  // Handle resume upload
  let resumeUrl = '';
  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file, 'hr-platform/resumes');
    resumeUrl = uploadResult.url;
  } else {
    res.status(400).json({
      success: false,
      message: 'Resume is required',
    });
    return;
  }

  const application = await prisma.jobApplication.create({
    data: {
      ...body,
      resumeUrl,
    },
    include: {
      job: true,
      applicant: {
        select: {
          userId: true,
          fullName: true,
          email: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  res.status(201).json({
    success: true,
    data: application,
  });
};

export const getJobApplication = async (req: Request, res: Response) => {
  const { id } = req.params;

  const application = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          employer: true,
        },
      },
      applicant: true,
    },
  });

  if (!application) {
    res.status(404).json({
      success: false,
      message: 'Job application not found',
    });
    return;
  }

  res.json({
    success: true,
    data: application,
  });
};

export const getAllJobApplications = async (req: Request, res: Response) => {
  const { jobId, applicantId, status, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (jobId) where.jobId = jobId;
  if (applicantId) where.applicantId = applicantId;
  if (status) where.status = status;

  const [applications, total] = await Promise.all([
    prisma.jobApplication.findMany({
      where,
      skip,
      take,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            employer: {
              select: {
                companyName: true,
              },
            },
          },
        },
        applicant: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    }),
    prisma.jobApplication.count({ where }),
  ]);

  res.json({
    success: true,
    data: applications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const getApplicationsByUser = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    applicantId: userId,
  };
  if (status) where.status = status;

  const [applications, total] = await Promise.all([
    prisma.jobApplication.findMany({
      where,
      skip,
      take,
      include: {
        job: {
          include: {
            employer: {
              select: {
                companyName: true,
              },
            },
          },
        },
        applicant: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
    }),
    prisma.jobApplication.count({ where }),
  ]);

  res.json({
    success: true,
    data: applications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const updateApplicationStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, interviewDate, interviewNotes } = req.body;

  const application = await prisma.jobApplication.update({
    where: { id },
    data: {
      status,
      interviewDate: interviewDate ? new Date(interviewDate) : undefined,
      interviewNotes,
      reviewedAt: status !== 'PENDING' ? new Date() : undefined,
    },
  });

  res.json({
    success: true,
    data: application,
  });
};

