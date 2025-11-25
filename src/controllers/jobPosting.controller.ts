import { Request, Response } from 'express';
import prisma from '../config/database';
import { jobPostingSchema } from '../utils/jobValidation';
import { updateJobPostingSchema } from '../utils/updateValidation';
import { getSocketIOInstance, emitNotification } from '../config/socket';
import { notifyUsersAboutNewJob, sendNearbyJobRecommendationsToAllUsers } from '../services/jobRecommendation.service';

const createJobPostingSchema = jobPostingSchema;

export const createJobPosting = async (req: Request, res: Response) => {
  const body = createJobPostingSchema.parse(req.body);

  // Verify employer exists and is approved
  const employer = await prisma.industrialKYC.findUnique({
    where: { userId: body.employerId },
  });

  if (!employer) {
    res.status(404).json({
      success: false,
      message: 'Employer not found',
    });
    return;
  }

  if (employer.status !== 'APPROVED') {
    res.status(403).json({
      success: false,
      message: 'Employer KYC must be approved to post jobs',
    });
    return;
  }

  const jobPosting = await prisma.jobPosting.create({
    data: {
      employerId: body.employerId,
      title: body.title,
      description: body.description,
      requirements: body.requirements,
      responsibilities: body.responsibilities,
      jobType: body.jobType,
      country: body.country,
      province: body.province,
      district: body.district,
      city: body.city,
      isRemote: body.isRemote,
      salaryMin: body.salaryMin,
      salaryMax: body.salaryMax,
      salaryType: body.salaryType,
      contractDuration: body.contractDuration,
      requiredSkills: body.requiredSkills || {},
      experienceYears: body.experienceYears,
      educationLevel: body.educationLevel,
      totalPositions: body.totalPositions,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      isActive: body.isActive !== undefined ? body.isActive : true,
      latitude: body.latitude,
      longitude: body.longitude,
    },
  });

  // Transform job posting to include location object for frontend compatibility
  const transformedJob = {
    ...jobPosting,
    location: {
      province: jobPosting.province,
      district: jobPosting.district,
      city: jobPosting.city,
      municipality: jobPosting.city,
      isRemote: jobPosting.isRemote,
    },
    salaryRange: (jobPosting.salaryMin !== null && jobPosting.salaryMin !== undefined) || (jobPosting.salaryMax !== null && jobPosting.salaryMax !== undefined) ? {
      min: jobPosting.salaryMin ?? 0,
      max: jobPosting.salaryMax ?? 0,
      currency: jobPosting.salaryType === 'MONTHLY' ? 'per month' : jobPosting.salaryType === 'YEARLY' ? 'per year' : jobPosting.salaryType === 'HOURLY' ? 'per hour' : jobPosting.salaryType === 'DAILY' ? 'per day' : 'per month',
    } : undefined,
    remoteWork: jobPosting.isRemote,
    verified: jobPosting.isVerified,
    numberOfPositions: jobPosting.totalPositions,
    // Keep original salary fields
    salaryMin: jobPosting.salaryMin,
    salaryMax: jobPosting.salaryMax,
    salaryType: jobPosting.salaryType,
    // Include latitude and longitude for map
    latitude: jobPosting.latitude,
    longitude: jobPosting.longitude,
  };

  // Notify eligible users about this new job (if verified and active)
  if (jobPosting.isActive && jobPosting.isVerified) {
    // Run in background - don't wait for it
    notifyUsersAboutNewJob(jobPosting.id).catch((error) => {
      console.error('Error notifying users about new job:', error);
    });

    // Also send nearby job recommendations if job has location
    if (jobPosting.latitude && jobPosting.longitude && !jobPosting.isRemote) {
      sendNearbyJobRecommendationsToAllUsers(30, 40).catch((error) => {
        console.error('Error sending nearby job recommendations:', error);
      });
    }
  }

  res.status(201).json({
    success: true,
    data: transformedJob,
  });
};

export const getJobPosting = async (req: Request, res: Response) => {
  const { id } = req.params;

  const jobPosting = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      employer: true,
      applications: {
        include: {
          applicant: {
            select: {
              userId: true,
              fullName: true,
              email: true,
              profilePhotoUrl: true,
            },
          },
        },
      },
    },
  });

  if (!jobPosting) {
    res.status(404).json({
      success: false,
      message: 'Job posting not found',
    });
    return;
  }

  // Increment view count and get updated job in one operation
  const updatedJob = await prisma.jobPosting.update({
    where: { id },
    data: { viewCount: { increment: 1 } },
    select: { viewCount: true },
  });

  // Transform job posting to include location object for frontend compatibility
  const transformedJob = {
    ...jobPosting,
    viewCount: updatedJob?.viewCount ?? jobPosting.viewCount ?? 0,
    location: {
      province: jobPosting.province || '',
      district: jobPosting.district || '',
      city: jobPosting.city || '',
      municipality: jobPosting.city || '', // Use city as municipality for frontend
      isRemote: jobPosting.isRemote || false,
    },
    // Keep original location fields for backward compatibility
    province: jobPosting.province,
    district: jobPosting.district,
    city: jobPosting.city,
    salaryRange: (jobPosting.salaryMin !== null && jobPosting.salaryMin !== undefined) || (jobPosting.salaryMax !== null && jobPosting.salaryMax !== undefined) ? {
      min: jobPosting.salaryMin ?? 0,
      max: jobPosting.salaryMax ?? 0,
      currency: jobPosting.salaryType === 'MONTHLY' ? 'per month' : jobPosting.salaryType === 'YEARLY' ? 'per year' : jobPosting.salaryType === 'HOURLY' ? 'per hour' : jobPosting.salaryType === 'DAILY' ? 'per day' : 'per month',
    } : undefined,
    remoteWork: jobPosting.isRemote,
    verified: jobPosting.isVerified,
    numberOfPositions: jobPosting.totalPositions,
    // Keep original salary fields
    salaryMin: jobPosting.salaryMin,
    salaryMax: jobPosting.salaryMax,
    salaryType: jobPosting.salaryType,
  };

  res.json({
    success: true,
    data: transformedJob,
  });
};

export const getAllJobPostings = async (req: Request, res: Response) => {
  const {
    employerId,
    jobType,
    province,
    district,
    city,
    isRemote,
    minSalary,
    maxSalary,
    experienceYears,
    educationLevel,
    contractDuration,
    industrySector,
    salaryType,
    datePosted,
    verifiedOnly,
    search,
    sortBy = 'newest',
    page = '1',
    limit = '10',
  } = req.query;

  // Debug: Log all query parameters
  console.log('=== Job Query Debug ===');
  console.log('All query params:', JSON.stringify(req.query, null, 2));
  console.log('employerId from query:', employerId);
  console.log('employerId type:', typeof employerId);

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};

  // Verified filter
  // If employerId is provided, show all jobs for that employer (including unverified and inactive)
  // Otherwise, default to showing only active and verified jobs
  if (employerId) {
    where.employerId = employerId;
    // Show all jobs for employer (active and inactive, verified and unverified)
    // Don't filter by isActive or isVerified when viewing own jobs
    console.log('Filtering by employerId:', employerId);
  } else {
    // For public listings (job seekers), show all active jobs
    // Only filter by verified if explicitly requested
    where.isActive = true;
    if (verifiedOnly === 'true') {
      where.isVerified = true;
    }
    // If verifiedOnly is not 'true', show all active jobs (verified and unverified)
  }
  
  console.log('Where clause:', JSON.stringify(where, null, 2));
  if (jobType) where.jobType = jobType;
  if (province) where.province = province;
  // District and city should use case-insensitive search for better user experience
  if (district) where.district = { contains: district as string, mode: 'insensitive' };
  if (city) where.city = { contains: city as string, mode: 'insensitive' };
  // Handle isRemote filter - only apply if explicitly 'true', otherwise show all (both remote and non-remote)
  if (isRemote === 'true') {
    where.isRemote = true;
  } else if (isRemote === 'false') {
    where.isRemote = false;
  }
  // If isRemote is undefined or empty string, don't filter by it (show all)
  if (minSalary) where.salaryMin = { gte: Number(minSalary) };
  if (maxSalary) where.salaryMax = { lte: Number(maxSalary) };
  if (experienceYears) where.experienceYears = { lte: Number(experienceYears) };
  if (educationLevel) where.educationLevel = educationLevel;
  if (contractDuration) where.contractDuration = { lte: Number(contractDuration) };
  if (salaryType) where.salaryType = salaryType;
  if (industrySector) {
    where.employer = {
      industrySector: { contains: industrySector as string, mode: 'insensitive' },
    };
  }
  if (datePosted) {
    const now = new Date();
    let dateThreshold = new Date();
    switch (datePosted) {
      case '1': // Last 24 hours
        dateThreshold.setHours(now.getHours() - 24);
        break;
      case '7': // Last week
        dateThreshold.setDate(now.getDate() - 7);
        break;
      case '30': // Last month
        dateThreshold.setDate(now.getDate() - 30);
        break;
      case '90': // Last 3 months
        dateThreshold.setDate(now.getDate() - 90);
        break;
    }
    where.createdAt = { gte: dateThreshold };
  }
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  // Determine sort order
  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'newest') {
    orderBy = { createdAt: 'desc' };
  } else if (sortBy === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (sortBy === 'salary-high') {
    orderBy = { salaryMax: 'desc' };
  } else if (sortBy === 'salary-low') {
    orderBy = { salaryMin: 'asc' };
  } else if (sortBy === 'applications') {
    // This requires a more complex query, we'll handle it differently
    orderBy = { createdAt: 'desc' };
  }

  // Try to get jobs without include first to debug
  const [jobs, total] = await Promise.all([
    prisma.jobPosting.findMany({
      where,
      skip,
      take,
      include: {
        employer: {
          select: {
            companyName: true,
            industrySector: true,
            province: true,
            district: true,
          },
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
      orderBy,
    }),
    prisma.jobPosting.count({ where }),
  ]);

  // Debug logging
  console.log('=== Query Results ===');
  console.log('employerId:', employerId);
  console.log('Where clause:', JSON.stringify(where, null, 2));
  console.log('Found jobs:', jobs.length);
  console.log('Total count:', total);
  if (jobs.length > 0) {
    console.log('Job IDs:', jobs.map(j => j.id));
    console.log('First job employerId:', jobs[0].employerId);
  }
  
  // Additional debug: Check if employer relation exists
  if (employerId && jobs.length === 0) {
    console.log('\n=== Debugging Empty Results ===');
    console.log('No jobs found, checking if IndustrialKYC exists for userId:', employerId);
    const industrialKYC = await prisma.industrialKYC.findUnique({
      where: { userId: employerId as string },
      select: { id: true, userId: true, companyName: true, status: true },
    });
    console.log('IndustrialKYC found:', industrialKYC);
    
    // Try direct query without include
    const directJobs = await prisma.jobPosting.findMany({
      where: { employerId: employerId as string },
      take: 5,
      select: { id: true, title: true, employerId: true, isActive: true, isVerified: true },
    });
    console.log('Direct query (no include) found:', directJobs.length, 'jobs');
    console.log('Direct jobs:', JSON.stringify(directJobs, null, 2));
    
    // Check all jobs in database
    const allJobs = await prisma.jobPosting.findMany({
      take: 10,
      select: { id: true, title: true, employerId: true },
    });
    console.log('All jobs in DB (first 10):', JSON.stringify(allJobs, null, 2));
    console.log('================================\n');
  }
  
  console.log('===================');

  // Transform jobs to include location object for frontend compatibility
  const transformedJobs = jobs.map((job) => ({
    ...job,
    location: {
      province: job.province || '',
      district: job.district || '',
      city: job.city || '',
      municipality: job.city || '', // Use city as municipality for frontend
      isRemote: job.isRemote || false,
    },
    // Keep original location fields for backward compatibility
    province: job.province,
    district: job.district,
    city: job.city,
    // Also include salaryRange for frontend compatibility
    salaryRange: (job.salaryMin !== null && job.salaryMin !== undefined) || (job.salaryMax !== null && job.salaryMax !== undefined) ? {
      min: job.salaryMin ?? 0,
      max: job.salaryMax ?? 0,
      currency: job.salaryType === 'MONTHLY' ? 'per month' : job.salaryType === 'YEARLY' ? 'per year' : job.salaryType === 'HOURLY' ? 'per hour' : job.salaryType === 'DAILY' ? 'per day' : 'per month',
    } : undefined,
    // Keep original salary fields for backward compatibility
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryType: job.salaryType,
    // Map isRemote to remoteWork for frontend
    remoteWork: job.isRemote,
    // Map isVerified to verified for frontend
    verified: job.isVerified,
    // Map numberOfPositions
    numberOfPositions: job.totalPositions,
    // Include latitude and longitude for map
    latitude: job.latitude,
    longitude: job.longitude,
  }));

  res.json({
    success: true,
    data: transformedJobs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const updateJobPosting = async (req: Request, res: Response) => {
  const { id } = req.params;
  const validatedData = updateJobPostingSchema.parse({ ...req.body, id });

  // Get current job posting to check if verification status is changing
  const currentJob = await prisma.jobPosting.findUnique({
    where: { id },
    include: {
      employer: {
        select: {
          userId: true,
          companyName: true,
        },
      },
    },
  });

  const jobPosting = await prisma.jobPosting.update({
    where: { id },
    data: {
      ...validatedData,
      expiresAt: validatedData.expiresAt
        ? new Date(validatedData.expiresAt)
        : undefined,
      latitude: validatedData.latitude,
      longitude: validatedData.longitude,
    },
    include: {
      employer: {
        select: {
          userId: true,
          companyName: true,
        },
      },
    },
  });

  // Emit notification if verification status changed
  const io = getSocketIOInstance();
  if (io && currentJob && currentJob.employer && 
      currentJob.isVerified !== jobPosting.isVerified) {
    const title = jobPosting.isVerified 
      ? 'Job Posting Verified! 🎉' 
      : 'Job Posting Verification Removed';
    const message = jobPosting.isVerified
      ? `Your job posting "${jobPosting.title}" has been verified and is now visible to all users.`
      : `Your job posting "${jobPosting.title}" verification has been removed.`;

    await emitNotification(io, currentJob.employer.userId, {
      type: 'JOB_VERIFICATION',
      title,
      message,
      data: {
        jobId: jobPosting.id,
        jobTitle: jobPosting.title,
        isVerified: jobPosting.isVerified,
      },
    });
  }

  // Transform job posting to include location object for frontend compatibility
  const transformedJob = {
    ...jobPosting,
    location: {
      province: jobPosting.province || '',
      district: jobPosting.district || '',
      city: jobPosting.city || '',
      municipality: jobPosting.city || '',
      isRemote: jobPosting.isRemote || false,
    },
    // Keep original location fields for backward compatibility
    province: jobPosting.province,
    district: jobPosting.district,
    city: jobPosting.city,
    salaryRange: (jobPosting.salaryMin !== null && jobPosting.salaryMin !== undefined) || (jobPosting.salaryMax !== null && jobPosting.salaryMax !== undefined) ? {
      min: jobPosting.salaryMin ?? 0,
      max: jobPosting.salaryMax ?? 0,
      currency: jobPosting.salaryType === 'MONTHLY' ? 'per month' : jobPosting.salaryType === 'YEARLY' ? 'per year' : jobPosting.salaryType === 'HOURLY' ? 'per hour' : jobPosting.salaryType === 'DAILY' ? 'per day' : 'per month',
    } : undefined,
    remoteWork: jobPosting.isRemote,
    verified: jobPosting.isVerified,
    numberOfPositions: jobPosting.totalPositions,
    // Keep original salary fields
    salaryMin: jobPosting.salaryMin,
    salaryMax: jobPosting.salaryMax,
    salaryType: jobPosting.salaryType,
    // Include latitude and longitude for map
    latitude: jobPosting.latitude,
    longitude: jobPosting.longitude,
  };

  res.json({
    success: true,
    data: transformedJob,
  });
};

export const deleteJobPosting = async (req: Request, res: Response) => {
  const { id } = req.params;

  await prisma.jobPosting.update({
    where: { id },
    data: { isActive: false },
  });

  res.json({
    success: true,
    message: 'Job posting deactivated',
  });
};
