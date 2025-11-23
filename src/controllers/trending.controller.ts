import { Request, Response } from 'express';
import prisma from '../config/database';

export const getTrendingJobs = async (req: Request, res: Response) => {
  const { province, district, limit = '10' } = req.query;

  try {
    // Calculate trending jobs from actual job postings
    // Trending = jobs with most applications in the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const where: any = {
      isActive: true,
      isVerified: true,
    };
    if (province) where.province = province;
    if (district) where.district = district;

    // Get jobs with application counts
    const jobsWithApplications = await prisma.jobPosting.findMany({
      where,
      include: {
        employer: {
          select: {
            companyName: true,
            industrySector: true,
          },
        },
        _count: {
          select: {
            applications: true, // Total applications
          },
        },
      },
      take: Number(limit) * 3, // Get more to calculate trend score
    });

    // Get recent application counts for each job
    const jobIds = jobsWithApplications.map(job => job.id);
    const recentApplicationCounts = await prisma.jobApplication.groupBy({
      by: ['jobId'],
      where: {
        jobId: { in: jobIds },
        appliedAt: {
          gte: sevenDaysAgo,
        },
      },
      _count: {
        id: true,
      },
    });

    // Create a map for quick lookup
    const recentCountsMap = new Map(
      recentApplicationCounts.map(item => [item.jobId, item._count.id])
    );

    // Calculate trend score for each job
    // Score = (recent applications * 2) + (total applications * 0.5) + (view count * 0.1) + (days since posted bonus)
    const trendingJobs = jobsWithApplications
      .map((job) => {
        const recentApplications = recentCountsMap.get(job.id) || 0;
        const totalApplications = job._count.applications || 0;
        const viewCount = job.viewCount || 0;
        const daysSincePosted = Math.floor(
          (new Date().getTime() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Calculate trend score
        // Higher score = more trending
        // Views are weighted less than applications but still contribute
        const trendScore = 
          (recentApplications * 2) + // Recent activity is weighted more
          (totalApplications * 0.5) + // Total applications also matter
          (viewCount * 0.1) + // Views indicate interest
          (Math.max(0, 30 - daysSincePosted) * 0.3); // Newer jobs get bonus

        return {
          jobId: job.id,
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
            isRemote: job.isRemote,
            remoteWork: job.isRemote, // Use isRemote for remoteWork compatibility
            latitude: job.latitude,
            longitude: job.longitude,
          },
          viewCount: viewCount,
          applicationCount: totalApplications,
          trendScore: Math.round(trendScore * 100) / 100,
        };
      })
      .sort((a, b) => {
        // Sort by trend score first, then by total applications, then by recency
        if (b.trendScore !== a.trendScore) {
          return b.trendScore - a.trendScore;
        }
        if (b.applicationCount !== a.applicationCount) {
          return b.applicationCount - a.applicationCount;
        }
        return new Date(b.job.createdAt).getTime() - new Date(a.job.createdAt).getTime();
      })
      .slice(0, Number(limit));

    // If we don't have enough trending jobs, fill with recent active jobs
    if (trendingJobs.length < Number(limit)) {
      const existingJobIds = new Set(trendingJobs.map(tj => tj.jobId));
      const additionalJobs = await prisma.jobPosting.findMany({
        where: {
          ...where,
          id: { notIn: Array.from(existingJobIds) },
        },
        include: {
          employer: {
            select: {
              companyName: true,
              industrySector: true,
            },
          },
          _count: {
            select: {
              applications: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: Number(limit) - trendingJobs.length,
      });

      const additionalTrending = additionalJobs.map((job) => ({
        jobId: job.id,
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
          isRemote: job.isRemote,
          remoteWork: job.isRemote, // Use isRemote for remoteWork compatibility
          latitude: job.latitude,
          longitude: job.longitude,
        },
        viewCount: 0,
        applicationCount: job._count.applications || 0,
        trendScore: 0.1, // Low score for new jobs without activity
      }));

      trendingJobs.push(...additionalTrending);
    }

    res.json({
      success: true,
      data: trendingJobs,
    });
  } catch (error: any) {
    console.error('Error fetching trending jobs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending jobs',
      error: error.message,
    });
  }
};

export const getTrendingSkills = async (req: Request, res: Response) => {
  const { category, limit = '10' } = req.query;

  const where: any = {};
  if (category) where.category = category;

  const trendingSkills = await prisma.trendingSkill.findMany({
    where,
    take: Number(limit),
    orderBy: {
      demandScore: 'desc',
    },
  });

  res.json({
    success: true,
    data: trendingSkills,
  });
};

export const createTrendingJob = async (req: Request, res: Response) => {
  const { jobTitle, category, demandScore, totalOpenings, avgSalary, province, district } = req.body;

  const trendingJob = await prisma.trendingJob.create({
    data: {
      jobTitle,
      category,
      demandScore,
      totalOpenings,
      avgSalary,
      province,
      district,
    },
  });

  res.status(201).json({
    success: true,
    data: trendingJob,
  });
};

export const createTrendingSkill = async (req: Request, res: Response) => {
  const { skillName, category, demandScore, relatedJobs, avgSalaryImpact } = req.body;

  const trendingSkill = await prisma.trendingSkill.create({
    data: {
      skillName,
      category,
      demandScore,
      relatedJobs,
      avgSalaryImpact,
    },
  });

  res.status(201).json({
    success: true,
    data: trendingSkill,
  });
};

