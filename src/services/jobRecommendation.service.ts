import prisma from '../config/database';
import { matchUsersToJob } from '../utils/skillMatching';
import emailService from './email.service';

interface JobRecommendation {
  id: string;
  title: string;
  companyName?: string;
  location: string;
  matchScore: number;
  salaryMin?: number;
  salaryMax?: number;
  jobType?: string;
}

/**
 * Find and send job recommendations to a user
 * Only sends if user has job alerts enabled and match score > 50%
 */
export const sendJobRecommendationsToUser = async (
  userId: string,
  minMatchScore: number = 50
): Promise<{ sent: boolean; jobCount: number }> => {
  try {
    // Get user with preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        individualKYC: true,
      },
    });

    if (!user || !user.individualKYC) {
      return { sent: false, jobCount: 0 };
    }

    // Check if user has job alerts enabled
    if (!user.jobAlerts || !user.emailNotifications) {
      return { sent: false, jobCount: 0 };
    }

    // Check if KYC is approved
    if (!user.individualKYC || user.individualKYC.status !== 'APPROVED') {
      return { sent: false, jobCount: 0 };
    }

    // Get active job postings
    const jobs = await prisma.jobPosting.findMany({
      where: {
        isActive: true,
        isVerified: true,
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
      },
      take: 50, // Get more to filter after matching
    });

    if (jobs.length === 0) {
      return { sent: false, jobCount: 0 };
    }

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
              userId: user.id,
              technicalSkills: user.individualKYC?.technicalSkills as any,
              province: user.individualKYC?.province || '',
              district: user.individualKYC?.district || '',
              city: user.individualKYC?.city || undefined,
              experience: user.individualKYC?.experience as any,
              latitude: user.individualKYC?.latitude || null,
              longitude: user.individualKYC?.longitude || null,
            },
          ]
        );

        return {
          match,
          job,
        };
      })
    );

    // Filter by minimum match score and sort
    const topMatches = matches
      .filter((m) => m.match.matchScore >= minMatchScore)
      .sort((a, b) => b.match.matchScore - a.match.matchScore)
      .slice(0, 10); // Top 10 matches

    if (topMatches.length === 0) {
      return { sent: false, jobCount: 0 };
    }

    // Check if user has already applied to these jobs
    const appliedJobIds = await prisma.jobApplication.findMany({
      where: {
        applicantId: userId,
        jobId: {
          in: topMatches.map((m) => m.job.id),
        },
      },
      select: {
        jobId: true,
      },
    });

    const appliedIds = new Set(appliedJobIds.map((a) => a.jobId));

    // Filter out already applied jobs
    const newMatches = topMatches.filter((m) => !appliedIds.has(m.job.id));

    if (newMatches.length === 0) {
      return { sent: false, jobCount: 0 };
    }

    // Format job recommendations
    const recommendations: JobRecommendation[] = newMatches.map((m) => ({
      id: m.job.id,
      title: m.job.title,
      companyName: m.job.employer?.companyName,
      location: `${m.job.city}, ${m.job.district}, ${m.job.province}`,
      matchScore: m.match.matchScore,
      salaryMin: m.job.salaryMin || undefined,
      salaryMax: m.job.salaryMax || undefined,
      jobType: m.job.jobType,
    }));

    // Send email
    await emailService.sendJobRecommendationEmail(
      {
        email: user.email,
        firstName: user.firstName,
      },
      recommendations
    );

    return { sent: true, jobCount: recommendations.length };
  } catch (error: any) {
    console.error('Error sending job recommendations:', error);
    return { sent: false, jobCount: 0 };
  }
};

/**
 * Send job recommendations to all eligible users
 * This can be run as a scheduled job (e.g., daily)
 */
export const sendJobRecommendationsToAllUsers = async (
  minMatchScore: number = 50
): Promise<{ totalUsers: number; emailsSent: number; totalJobs: number }> => {
  try {
    // Get all users with approved KYC and job alerts enabled
    const users = await prisma.user.findMany({
      where: {
        jobAlerts: true,
        emailNotifications: true,
        status: 'ACTIVE',
        isEmailVerified: true,
        individualKYC: {
          status: 'APPROVED',
        },
      },
      select: {
        id: true,
      },
      take: 1000, // Limit to prevent overload
    });

    let emailsSent = 0;
    let totalJobs = 0;

    // Send recommendations to each user
    for (const user of users) {
      const result = await sendJobRecommendationsToUser(user.id, minMatchScore);
      if (result.sent) {
        emailsSent++;
        totalJobs += result.jobCount;
      }
    }

    return {
      totalUsers: users.length,
      emailsSent,
      totalJobs,
    };
  } catch (error: any) {
    console.error('Error sending job recommendations to all users:', error);
    return {
      totalUsers: 0,
      emailsSent: 0,
      totalJobs: 0,
    };
  }
};

