import { Request, Response } from 'express';
import prisma from '../config/database';
import { matchUsersToJob } from '../utils/skillMatching';
import { AuthRequest } from '../middleware/auth';

export const matchJobToUsers = async (req: Request, res: Response) => {
  const { jobId, limit = '10' } = req.query;

  if (!jobId) {
    res.status(400).json({
      success: false,
      message: 'Job ID is required',
    });
    return;
  }

  // Get job posting
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobId as string },
  });

  if (!job) {
    res.status(404).json({
      success: false,
      message: 'Job posting not found',
    });
    return;
  }

  // Get all approved individual KYCs
  const users = await prisma.individualKYC.findMany({
    where: {
      status: 'APPROVED',
    },
    select: {
      userId: true,
      technicalSkills: true,
      province: true,
      district: true,
      city: true,
      experience: true,
      fullName: true,
      email: true,
      profilePhotoUrl: true,
      latitude: true,
      longitude: true,
    },
    take: Number(limit) * 3, // Get more to filter after matching
  });

  // Match users to job
  const matches = await matchUsersToJob(
    {
      requiredSkills: job.requiredSkills as any,
      province: job.province,
      district: job.district,
      city: job.city,
      isRemote: job.isRemote,
      experienceYears: job.experienceYears,
      latitude: job.latitude,
      longitude: job.longitude,
    },
    users
  );

  // Get top matches
  const topMatches = matches.slice(0, Number(limit));

  // Enrich with user details
  const enrichedMatches = topMatches.map((match) => {
    const user = users.find((u) => u.userId === match.userId);
    return {
      ...match,
      user: user
        ? {
            userId: user.userId,
            fullName: user.fullName,
            email: user.email,
            profilePhotoUrl: user.profilePhotoUrl,
          }
        : null,
    };
  });

  res.json({
    success: true,
    data: enrichedMatches,
    job: {
      id: job.id,
      title: job.title,
      requiredSkills: job.requiredSkills,
    },
  });
};

export const matchUserToJobs = async (req: Request, res: Response) => {
  const { userId, limit = '10' } = req.query;

  if (!userId) {
    res.status(400).json({
      success: false,
      message: 'User ID is required',
    });
    return;
  }

  // Get user profile
  const user = await prisma.individualKYC.findUnique({
    where: { userId: userId as string },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User profile not found',
    });
    return;
  }

  // Get active job postings
  const jobs = await prisma.jobPosting.findMany({
    where: {
      isActive: true,
      isVerified: true,
    },
    include: {
      employer: {
        select: {
          companyName: true,
          industrySector: true,
        },
      },
    },
    take: Number(limit) * 3,
  });

  // Match user to jobs
  const matches = await Promise.all(
    jobs.map(async (job) => {
      const [match] = await matchUsersToJob(
        {
          requiredSkills: job.requiredSkills as any,
          province: job.province,
          district: job.district,
          city: job.city,
          isRemote: job.isRemote,
          experienceYears: job.experienceYears,
          latitude: job.latitude,
          longitude: job.longitude,
        },
        [
          {
            userId: user.userId,
            technicalSkills: user.technicalSkills as any,
            province: user.province,
            district: user.district,
            city: user.city || undefined,
            experience: user.experience as any,
            latitude: user.latitude,
            longitude: user.longitude,
          },
        ]
      );

      return {
        ...match,
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          jobType: job.jobType,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          location: {
            province: job.province,
            district: job.district,
            city: job.city,
            isRemote: job.isRemote,
          },
          employer: job.employer,
        },
      };
    })
  );

  // Sort by match score and get top matches
  const topMatches = matches
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, Number(limit));

  res.json({
    success: true,
    data: topMatches,
    user: {
      userId: user.userId,
      fullName: user.fullName,
      technicalSkills: user.technicalSkills,
    },
  });
};

export const searchBySkills = async (req: Request, res: Response) => {
  const { skills, location, page = '1', limit = '10' } = req.query;

  if (!skills) {
    res.status(400).json({
      success: false,
      message: 'Skills parameter is required',
    });
    return;
  }

  const skillArray = (skills as string).split(',').map((s) => s.trim().toLowerCase());
  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {
    status: 'APPROVED',
  };

  if (location) {
    const locationParts = (location as string).split(',');
    if (locationParts[0]) where.province = locationParts[0].trim();
    if (locationParts[1]) where.district = locationParts[1].trim();
    if (locationParts[2]) where.city = locationParts[2].trim();
  }

  const users = await prisma.individualKYC.findMany({
    where,
    skip,
    take,
    select: {
      userId: true,
      fullName: true,
      email: true,
      profilePhotoUrl: true,
      technicalSkills: true,
      province: true,
      district: true,
      city: true,
      experience: true,
    },
  });

  // Filter users by skills
  const matchedUsers = users
    .map((user) => {
      const userSkills = (user.technicalSkills as { [key: string]: number } | null) || {};
      const userSkillNames = Object.keys(userSkills).map((s) => s.toLowerCase());

      const matchedSkills = skillArray.filter((skill) =>
        userSkillNames.some((userSkill) => userSkill.includes(skill) || skill.includes(userSkill))
      );

      return {
        ...user,
        matchedSkills,
        matchCount: matchedSkills.length,
        matchPercentage: (matchedSkills.length / skillArray.length) * 100,
      };
    })
    .filter((user) => user.matchCount > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage);

  res.json({
    success: true,
    data: matchedUsers,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: matchedUsers.length,
    },
  });
};

/**
 * Get job recommendations for authenticated user
 * Returns jobs sorted by match score
 */
export const getJobRecommendations = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
    });
  }

  const { limit = '10', minScore = '50' } = req.query;

  try {
    // Get user profile
    const user = await prisma.individualKYC.findUnique({
      where: { userId },
    });

    if (!user || user.status !== 'APPROVED') {
      res.status(404).json({
        success: false,
        message: 'User profile not found or not approved',
      });
      return;
    }

    // Get active job postings
    const jobs = await prisma.jobPosting.findMany({
      where: {
        isActive: true,
        isVerified: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        employer: {
          select: {
            companyName: true,
            industrySector: true,
          },
        },
      },
      take: Number(limit) * 3,
    });

    // Match user to jobs
    const matches = await Promise.all(
      jobs.map(async (job) => {
        const [match] = await matchUsersToJob(
          {
            requiredSkills: job.requiredSkills as any,
            province: job.province,
            district: job.district,
            city: job.city,
            isRemote: job.isRemote,
            experienceYears: job.experienceYears,
            latitude: job.latitude,
            longitude: job.longitude,
          },
          [
            {
              userId: user.userId,
              technicalSkills: user.technicalSkills as any,
              province: user.province,
              district: user.district,
              city: user.city || undefined,
              experience: user.experience as any,
              latitude: user.latitude,
              longitude: user.longitude,
            },
          ]
        );

        return {
          ...match,
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
            jobType: job.jobType,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            location: {
              province: job.province,
              district: job.district,
              city: job.city,
              isRemote: job.isRemote,
            },
            employer: job.employer,
            createdAt: job.createdAt,
          },
        };
      })
    );

    // Filter by minimum score and sort
    const topMatches = matches
      .filter((m) => m.matchScore >= Number(minScore))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, Number(limit));

    return res.json({
      success: true,
      data: topMatches,
      count: topMatches.length,
    });
  } catch (error: any) {
    console.error('Error getting job recommendations:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get job recommendations',
    });
  }
};

