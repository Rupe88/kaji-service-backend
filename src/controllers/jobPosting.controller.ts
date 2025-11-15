import { Request, Response } from 'express';
import prisma from '../config/database';
import { jobPostingSchema } from '../utils/jobValidation';
import { updateJobPostingSchema } from '../utils/updateValidation';

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
    },
  });

  res.status(201).json({
    success: true,
    data: jobPosting,
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

  res.json({
    success: true,
    data: jobPosting,
  });
};

export const getAllJobPostings = async (req: Request, res: Response) => {
  const {
    employerId,
    jobType,
    province,
    district,
    isRemote,
    minSalary,
    maxSalary,
    search,
    page = '1',
    limit = '10',
  } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    isActive: true,
    isVerified: true,
  };

  if (employerId) where.employerId = employerId;
  if (jobType) where.jobType = jobType;
  if (province) where.province = province;
  if (district) where.district = district;
  if (isRemote !== undefined) where.isRemote = isRemote === 'true';
  if (minSalary) where.salaryMin = { gte: Number(minSalary) };
  if (maxSalary) where.salaryMax = { lte: Number(maxSalary) };
  if (search) {
    where.OR = [
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
    ];
  }

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
      orderBy: { createdAt: 'desc' },
    }),
    prisma.jobPosting.count({ where }),
  ]);

  res.json({
    success: true,
    data: jobs,
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

  const jobPosting = await prisma.jobPosting.update({
    where: { id },
    data: {
      ...validatedData,
      expiresAt: validatedData.expiresAt
        ? new Date(validatedData.expiresAt)
        : undefined,
    },
  });

  res.json({
    success: true,
    data: jobPosting,
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
