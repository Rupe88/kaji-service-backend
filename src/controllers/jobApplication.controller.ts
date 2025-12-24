import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/database';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { jobApplicationSchema } from '../utils/jobValidation';
import { getSocketIOInstance, emitNotification } from '../config/socket';
import { sendSimilarJobRecommendations, sendSkillRecommendationsOnRejection } from '../services/jobRecommendation.service';
import emailService from '../services/email.service';

const createJobApplicationSchema = jobApplicationSchema;

export const createJobApplication = async (req: AuthRequest & Request, res: Response) => {
  // Check if user is authenticated
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Block industrial users (employers) from applying to jobs
  if (req.user.role === 'INDUSTRIAL') {
    res.status(403).json({
      success: false,
      message: 'Employers cannot apply for jobs. Only individual job seekers can apply.',
    });
    return;
  }

  // Ensure only INDIVIDUAL users can apply
  if (req.user.role !== 'INDIVIDUAL') {
    res.status(403).json({
      success: false,
      message: 'Only individual job seekers can apply for jobs',
    });
    return;
  }

  const body = createJobApplicationSchema.parse(req.body);

  // Verify that applicantId matches the authenticated user
  if (body.applicantId !== req.user.id) {
    res.status(403).json({
      success: false,
      message: 'You can only apply using your own account',
    });
    return;
  }

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
    const uploadResult = await uploadToCloudinary(req.file, 'service-platform/resumes');
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
      job: {
        include: {
          employer: {
            select: {
              userId: true,
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
  });

  // Emit notification to employer about new application
  const io = getSocketIOInstance();
  if (io && application.job.employer) {
    const notificationData = {
      type: 'JOB_APPLICATION',
      title: 'New Job Application Received',
      message: `${application.applicant.fullName} applied for "${application.job.title}"`,
      data: {
        applicationId: application.id,
        jobId: application.job.id,
        applicantId: application.applicant.userId,
        applicantName: application.applicant.fullName,
        jobTitle: application.job.title,
        companyName: application.job.employer.companyName,
      },
    };
    
    await emitNotification(io, application.job.employer.userId, notificationData);
    console.log(`📬 Socket.io: Sent job application notification to employer ${application.job.employer.userId}`, {
      jobId: application.job.id,
      applicationId: application.id,
      applicantName: application.applicant.fullName,
    });
  } else if (!io) {
    console.warn('⚠️ Socket.io instance not available, notification not sent');
  } else if (!application.job.employer) {
    console.warn('⚠️ Employer not found for job, notification not sent');
  }

  // Send similar job recommendations to user (async, don't wait)
  sendSimilarJobRecommendations(req.user.id, application.job.id).catch((error) => {
    console.error('Error sending similar job recommendations:', error);
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

  // Filter out placeholder/invalid resume URLs
  const validApplication = {
    ...application,
    resumeUrl: application.resumeUrl && (
      application.resumeUrl.includes('example.com') ||
      application.resumeUrl.includes('placeholder') ||
      application.resumeUrl.includes('dummy')
    ) ? null : application.resumeUrl,
  };

  res.json({
    success: true,
    data: validApplication,
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

  // Filter out placeholder/invalid resume URLs
  const validApplications = applications.map((app) => {
    // Check if resumeUrl is a placeholder
    if (app.resumeUrl && (
      app.resumeUrl.includes('example.com') ||
      app.resumeUrl.includes('placeholder') ||
      app.resumeUrl.includes('dummy')
    )) {
      // Set to null to indicate invalid URL
      return {
        ...app,
        resumeUrl: null,
      };
    }
    return app;
  });

  res.json({
    success: true,
    data: validApplications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const getApplicationsByJob = async (req: AuthRequest & Request, res: Response) => {
  const { jobId } = req.params;
  const { status, page = '1', limit = '10' } = req.query;

  // Check if user is authenticated
  if (!req.user) {
    res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
    return;
  }

  // Verify job exists and belongs to the employer
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId },
    include: {
      employer: {
        select: {
          userId: true,
          companyName: true,
        },
      },
    },
  });

  if (!job) {
    res.status(404).json({
      success: false,
      message: 'Job posting not found',
    });
    return;
  }

  // Verify the employer owns this job (only employers can view applications)
  if (req.user.role !== 'INDUSTRIAL' || job.employer.userId !== req.user.id) {
    res.status(403).json({
      success: false,
      message: 'You do not have permission to view applications for this job',
    });
    return;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    jobId,
  };
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

  // Filter out placeholder/invalid resume URLs
  const validApplications = applications.map((app) => {
    // Check if resumeUrl is a placeholder
    if (app.resumeUrl && (
      app.resumeUrl.includes('example.com') ||
      app.resumeUrl.includes('placeholder') ||
      app.resumeUrl.includes('dummy')
    )) {
      // Set to null to indicate invalid URL
      return {
        ...app,
        resumeUrl: null,
      };
    }
    return app;
  });

  res.json({
    success: true,
    data: validApplications,
    count: total,
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

  // Filter out placeholder/invalid resume URLs
  const validApplications = applications.map((app) => {
    // Check if resumeUrl is a placeholder
    if (app.resumeUrl && (
      app.resumeUrl.includes('example.com') ||
      app.resumeUrl.includes('placeholder') ||
      app.resumeUrl.includes('dummy')
    )) {
      // Set to null to indicate invalid URL
      return {
        ...app,
        resumeUrl: null,
      };
    }
    return app;
  });

  res.json({
    success: true,
    data: validApplications,
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

  // Get application with related data before updating
  const existingApplication = await prisma.jobApplication.findUnique({
    where: { id },
    include: {
      job: {
        include: {
          employer: {
            select: {
              userId: true,
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
        },
      },
    },
  });

  if (!existingApplication) {
    res.status(404).json({
      success: false,
      message: 'Application not found',
    });
    return;
  }

  // Prepare update data
  const updateData: any = {
    status,
    interviewNotes,
    reviewedAt: status !== 'PENDING' ? new Date() : undefined,
  };

  // Handle interview date - only set if status is INTERVIEW, otherwise clear it
  if (status === 'INTERVIEW' && interviewDate) {
    updateData.interviewDate = new Date(interviewDate);
  } else if (status !== 'INTERVIEW') {
    // Clear interview date if status is not INTERVIEW
    updateData.interviewDate = null;
  }

  const application = await prisma.jobApplication.update({
    where: { id },
    data: updateData,
    include: {
      job: {
        include: {
          employer: {
            select: {
              userId: true,
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
        },
      },
    },
  });

  // Emit notification to applicant about status update
  const io = getSocketIOInstance();
  if (io && application.applicant) {
    let title = 'Application Status Updated';
    let message = `Your application for "${application.job.title}" is now ${status}`;

    // Handle different status types with appropriate messages
    if (status === 'REVIEWED') {
      title = 'Application Under Review';
      message = `Your application for "${application.job.title}" is now under review by ${application.job.employer?.companyName || 'the employer'}`;
    } else if (status === 'SHORTLISTED') {
      title = 'Application Shortlisted! 🎯';
      message = `Great news! Your application for "${application.job.title}" has been shortlisted`;
    } else if (status === 'INTERVIEW' || status === 'INTERVIEW_SCHEDULED') {
      if (interviewDate) {
        title = 'Interview Scheduled 📅';
        message = `Interview scheduled for "${application.job.title}" on ${new Date(interviewDate).toLocaleDateString()} at ${new Date(interviewDate).toLocaleTimeString()}`;
      } else {
        title = 'Interview Stage';
        message = `Your application for "${application.job.title}" has moved to the interview stage`;
      }
    } else if (status === 'ACCEPTED') {
      title = 'Application Accepted! 🎉';
      message = `Congratulations! Your application for "${application.job.title}" has been accepted`;
    } else if (status === 'REJECTED') {
      title = 'Application Update';
      message = `Your application for "${application.job.title}" was not selected`;
      
      // Send skill recommendations when rejected (async, don't wait)
      sendSkillRecommendationsOnRejection(application.applicant.userId, application.job.id).catch((error) => {
        console.error('Error sending skill recommendations:', error);
      });
    } else if (status === 'PENDING') {
      title = 'Application Received';
      message = `Your application for "${application.job.title}" has been received and is pending review`;
    }

    await emitNotification(io, application.applicant.userId, {
      type: 'APPLICATION_STATUS',
      title,
      message,
      data: {
        applicationId: application.id,
        jobId: application.job.id,
        status,
        interviewDate: interviewDate || undefined,
        jobTitle: application.job.title,
        companyName: application.job.employer?.companyName,
      },
    });

    // Send email notification (async, don't wait)
    if (application.applicant.email && application.applicant.userId) {
      emailService.sendApplicationStatusEmail(
        {
          email: application.applicant.email,
          firstName: application.applicant.fullName?.split(' ')[0] || undefined,
        },
        {
          jobTitle: application.job.title,
          companyName: application.job.employer?.companyName,
          status,
          interviewDate: interviewDate || undefined,
          applicationId: application.id,
          jobId: application.job.id,
        }
      ).catch((error) => {
        console.error('Error sending application status email:', error);
      });
    }
  }

  res.json({
    success: true,
    data: application,
  });
};

