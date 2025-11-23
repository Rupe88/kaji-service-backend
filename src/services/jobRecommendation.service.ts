import prisma from '../config/database';
import { matchUsersToJob, calculateDistance } from '../utils/skillMatching';
import emailService from './email.service';
import { getSocketIOInstance, emitNotification } from '../config/socket';

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

    // Send Socket.io notification for real-time updates
    const io = getSocketIOInstance();
    if (io && recommendations.length > 0) {
      const topRecommendation = recommendations[0]; // Get the best match
      emitNotification(io, userId, {
        type: 'JOB_RECOMMENDATION',
        title: '🎯 New Job Matches Your Profile!',
        message: `We found ${recommendations.length} job${recommendations.length > 1 ? 's' : ''} matching your skills and location. Top match: ${topRecommendation.title} (${Math.round(topRecommendation.matchScore)}% match)`,
        data: {
          jobCount: recommendations.length,
          topMatch: {
            jobId: topRecommendation.id,
            title: topRecommendation.title,
            companyName: topRecommendation.companyName,
            matchScore: topRecommendation.matchScore,
            location: topRecommendation.location,
          },
          allRecommendations: recommendations.map(r => ({
            jobId: r.id,
            title: r.title,
            matchScore: r.matchScore,
          })),
        },
      });
      console.log(`📬 Socket.io: Sent job recommendation notification to user ${userId}`, {
        jobCount: recommendations.length,
        topMatch: topRecommendation.title,
      });
    }

    return { sent: true, jobCount: recommendations.length };
  } catch (error: any) {
    console.error('Error sending job recommendations:', error);
    return { sent: false, jobCount: 0 };
  }
};

/**
 * Notify users about a newly posted job that matches their profile
 * This is called when a new job is created or verified
 */
export const notifyUsersAboutNewJob = async (
  jobId: string,
  minMatchScore: number = 50
): Promise<{ notified: number; jobTitle?: string }> => {
  try {
    // Get the job posting
    const job = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
      },
    });

    if (!job || !job.isActive || !job.isVerified) {
      return { notified: 0 };
    }

    // Check if job is expired
    if (job.expiresAt && job.expiresAt <= new Date()) {
      return { notified: 0 };
    }

    // Get all users with approved KYC and job alerts enabled
    const users = await prisma.user.findMany({
      where: {
        jobAlerts: true,
        status: 'ACTIVE',
        isEmailVerified: true,
        individualKYC: {
          status: 'APPROVED',
        },
      },
      include: {
        individualKYC: true,
      },
      take: 500, // Limit to prevent overload
    });

    let notifiedCount = 0;
    const io = getSocketIOInstance();

    // Check each user for match
    for (const user of users) {
      if (!user.individualKYC) continue;

      // Match user to this job
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
            technicalSkills: user.individualKYC.technicalSkills as any,
            province: user.individualKYC.province || '',
            district: user.individualKYC.district || '',
            city: user.individualKYC.city || undefined,
            experience: user.individualKYC.experience as any,
            latitude: user.individualKYC.latitude || null,
            longitude: user.individualKYC.longitude || null,
          },
        ]
      );

      // Only notify if match score is high enough
      if (match.matchScore >= minMatchScore) {
        // Check if user already applied
        const hasApplied = await prisma.jobApplication.findFirst({
          where: {
            applicantId: user.id,
            jobId: job.id,
          },
        });

        if (hasApplied) continue; // Skip if already applied

        // Send Socket.io notification
        if (io) {
          emitNotification(io, user.id, {
            type: 'JOB_RECOMMENDATION',
            title: '🎯 New Job Matches Your Profile!',
            message: `${job.title} at ${job.employer?.companyName || 'Company'} matches your skills and location (${Math.round(match.matchScore)}% match)`,
            data: {
              jobId: job.id,
              jobTitle: job.title,
              companyName: job.employer?.companyName,
              matchScore: match.matchScore,
              location: `${job.city}, ${job.district}, ${job.province}`,
              matchedSkills: match.details?.matchedSkills || [],
            },
          });
        }

        // Send email if email notifications enabled
        if (user.emailNotifications) {
          try {
            await emailService.sendJobRecommendationEmail(
              {
                email: user.email,
                firstName: user.firstName,
              },
              [
                {
                  id: job.id,
                  title: job.title,
                  companyName: job.employer?.companyName,
                  location: `${job.city}, ${job.district}, ${job.province}`,
                  matchScore: match.matchScore,
                  salaryMin: job.salaryMin || undefined,
                  salaryMax: job.salaryMax || undefined,
                  jobType: job.jobType,
                },
              ]
            );
          } catch (emailError) {
            console.error(`Error sending email to ${user.email}:`, emailError);
          }
        }

        notifiedCount++;
      }
    }

    console.log(`📬 Notified ${notifiedCount} users about new job: ${job.title}`);
    return { notified: notifiedCount, jobTitle: job.title };
  } catch (error: any) {
    console.error('Error notifying users about new job:', error);
    return { notified: 0 };
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

/**
 * Send skill recommendations when user applies for a job
 * Suggests similar jobs based on the job they just applied to
 */
export const sendSimilarJobRecommendations = async (
  userId: string,
  appliedJobId: string
): Promise<{ sent: boolean; jobCount: number }> => {
  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        individualKYC: true,
      },
    });

    if (!user || !user.individualKYC || user.individualKYC.status !== 'APPROVED') {
      return { sent: false, jobCount: 0 };
    }

    // Get the job user applied to
    const appliedJob = await prisma.jobPosting.findUnique({
      where: { id: appliedJobId },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
      },
    });

    if (!appliedJob) {
      return { sent: false, jobCount: 0 };
    }

    // Find similar jobs (similar job type, different from applied job)
    const similarJobs = await prisma.jobPosting.findMany({
      where: {
        isActive: true,
        isVerified: true,
        id: { not: appliedJobId }, // Exclude the job they just applied to
        expiresAt: {
          gt: new Date(),
        },
        // Similar job type
        jobType: appliedJob.jobType,
      },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
      },
      take: 20,
    });

    if (similarJobs.length === 0) {
      return { sent: false, jobCount: 0 };
    }

    // Match user to similar jobs
    const matches = await Promise.all(
      similarJobs.map(async (job) => {
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

    // Filter by match score and exclude already applied jobs
    const topMatches = matches
      .filter((m) => m.match.matchScore >= 40) // Lower threshold for similar jobs
      .sort((a, b) => b.match.matchScore - a.match.matchScore)
      .slice(0, 5); // Top 5 similar jobs

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
    const newMatches = topMatches.filter((m) => !appliedIds.has(m.job.id));

    if (newMatches.length === 0) {
      return { sent: false, jobCount: 0 };
    }

    // Format recommendations
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

    // Send email if enabled
    if (user.emailNotifications) {
      try {
        await emailService.sendJobRecommendationEmail(
          {
            email: user.email,
            firstName: user.firstName,
          },
          recommendations
        );
      } catch (emailError) {
        console.error(`Error sending similar jobs email to ${user.email}:`, emailError);
      }
    }

    // Send Socket.io notification
    const io = getSocketIOInstance();
    if (io && recommendations.length > 0) {
      emitNotification(io, userId, {
        type: 'JOB_RECOMMENDATION',
        title: '💡 Similar Jobs You Might Like',
        message: `Since you applied for "${appliedJob.title}", here are ${recommendations.length} similar job${recommendations.length > 1 ? 's' : ''} you might be interested in`,
        data: {
          jobCount: recommendations.length,
          appliedJob: {
            jobId: appliedJob.id,
            title: appliedJob.title,
          },
          allRecommendations: recommendations.map(r => ({
            jobId: r.id,
            title: r.title,
            matchScore: r.matchScore,
          })),
        },
      });
    }

    return { sent: true, jobCount: recommendations.length };
  } catch (error: any) {
    console.error('Error sending similar job recommendations:', error);
    return { sent: false, jobCount: 0 };
  }
};

/**
 * Send skill recommendations when user gets rejected
 * Shows missing skills and suggests similar jobs
 */
export const sendSkillRecommendationsOnRejection = async (
  userId: string,
  jobId: string
): Promise<{ sent: boolean; missingSkills: string[] }> => {
  try {
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        individualKYC: true,
      },
    });

    if (!user || !user.individualKYC || user.individualKYC.status !== 'APPROVED') {
      return { sent: false, missingSkills: [] };
    }

    // Get the rejected job
    const rejectedJob = await prisma.jobPosting.findUnique({
      where: { id: jobId },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
      },
    });

    if (!rejectedJob) {
      return { sent: false, missingSkills: [] };
    }

    // Calculate skill match to find missing skills
    const [match] = await matchUsersToJob(
      {
        requiredSkills: rejectedJob.requiredSkills as any,
        province: rejectedJob.province,
        district: rejectedJob.district,
        city: rejectedJob.city,
        isRemote: rejectedJob.isRemote,
        experienceYears: rejectedJob.experienceYears,
        latitude: rejectedJob.latitude,
        longitude: rejectedJob.longitude,
      },
      [
        {
          userId: user.id,
          technicalSkills: user.individualKYC.technicalSkills as any,
          province: user.individualKYC.province || '',
          district: user.individualKYC.district || '',
          city: user.individualKYC.city || undefined,
          experience: user.individualKYC.experience as any,
          latitude: user.individualKYC.latitude || null,
          longitude: user.individualKYC.longitude || null,
        },
      ]
    );

    const missingSkills = match.details?.missingSkills || [];
    const matchedSkills = match.details?.matchedSkills || [];

    if (missingSkills.length === 0) {
      return { sent: false, missingSkills: [] };
    }

    // Find similar jobs user can apply for (with their current skills)
    const similarJobs = await prisma.jobPosting.findMany({
      where: {
        isActive: true,
        isVerified: true,
        id: { not: jobId },
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
      },
      take: 10,
    });

    // Match user to similar jobs
    const matches = await Promise.all(
      similarJobs.map(async (job) => {
        const [jobMatch] = await matchUsersToJob(
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
          match: jobMatch,
          job,
        };
      })
    );

    // Filter by match score and exclude already applied jobs
    const topMatches = matches
      .filter((m) => m.match.matchScore >= 50)
      .sort((a, b) => b.match.matchScore - a.match.matchScore)
      .slice(0, 3);

    // Check if user has already applied
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
    const availableJobs = topMatches.filter((m) => !appliedIds.has(m.job.id));

    // Send email with skill recommendations
    if (user.emailNotifications) {
      try {
        await emailService.sendSkillRecommendationEmail(
          {
            email: user.email,
            firstName: user.firstName,
          },
          {
            jobTitle: rejectedJob.title,
            companyName: rejectedJob.employer?.companyName,
            missingSkills,
            matchedSkills,
            similarJobs: availableJobs.map((m) => ({
              id: m.job.id,
              title: m.job.title,
              companyName: m.job.employer?.companyName,
              location: `${m.job.city}, ${m.job.district}, ${m.job.province}`,
              matchScore: m.match.matchScore,
            })),
          }
        );
      } catch (emailError) {
        console.error(`Error sending skill recommendation email to ${user.email}:`, emailError);
      }
    }

    // Send Socket.io notification
    const io = getSocketIOInstance();
    if (io) {
      emitNotification(io, userId, {
        type: 'SKILL_RECOMMENDATION',
        title: '💡 Skills to Improve Your Profile',
        message: `Based on your application for "${rejectedJob.title}", here are skills to learn: ${missingSkills.slice(0, 3).join(', ')}`,
        data: {
          jobTitle: rejectedJob.title,
          companyName: rejectedJob.employer?.companyName,
          missingSkills,
          matchedSkills,
          similarJobsCount: availableJobs.length,
        },
      });
    }

    return { sent: true, missingSkills };
  } catch (error: any) {
    console.error('Error sending skill recommendations:', error);
    return { sent: false, missingSkills: [] };
  }
};

/**
 * Send nearby job recommendations based on location (within 30km)
 * This finds jobs within 30km radius and matches them with user's skills
 */
export const sendNearbyJobRecommendations = async (
  userId: string,
  maxDistanceKm: number = 30,
  minMatchScore: number = 40
): Promise<{ sent: boolean; jobCount: number }> => {
  try {
    // Get user with location
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        individualKYC: true,
      },
    });

    if (!user || !user.individualKYC || user.individualKYC.status !== 'APPROVED') {
      return { sent: false, jobCount: 0 };
    }

    // Check if user has location coordinates
    if (!user.individualKYC.latitude || !user.individualKYC.longitude) {
      return { sent: false, jobCount: 0 };
    }

    // Check if user has job alerts enabled
    if (!user.jobAlerts) {
      return { sent: false, jobCount: 0 };
    }

    // Get all active jobs with coordinates
    const allJobs = await prisma.jobPosting.findMany({
      where: {
        isActive: true,
        isVerified: true,
        expiresAt: {
          gt: new Date(),
        },
        latitude: { not: null },
        longitude: { not: null },
        isRemote: false, // Only physical jobs for location-based matching
      },
      include: {
        employer: {
          select: {
            companyName: true,
          },
        },
      },
      take: 100, // Get more to filter by distance
    });

    if (allJobs.length === 0) {
      return { sent: false, jobCount: 0 };
    }

    // Filter jobs within 30km radius
    // We already checked that user.individualKYC exists and has coordinates above
    const userLat = user.individualKYC!.latitude!;
    const userLon = user.individualKYC!.longitude!;
    
    const nearbyJobs = allJobs.filter((job) => {
      if (!job.latitude || !job.longitude) return false;
      const distance = calculateDistance(
        userLat,
        userLon,
        job.latitude,
        job.longitude
      );
      return distance <= maxDistanceKm;
    });

    if (nearbyJobs.length === 0) {
      return { sent: false, jobCount: 0 };
    }

    // Match user to nearby jobs
    const matches = await Promise.all(
      nearbyJobs.map(async (job) => {
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

        // Calculate distance
        // We already checked that user.individualKYC exists and has coordinates above
        const distance = job.latitude && job.longitude
          ? calculateDistance(
              userLat,
              userLon,
              job.latitude,
              job.longitude
            )
          : undefined;

        return {
          match,
          job,
          distance,
        };
      })
    );

    // Filter by minimum match score and sort by distance (closest first)
    const topMatches = matches
      .filter((m) => m.match.matchScore >= minMatchScore)
      .sort((a, b) => {
        // Sort by distance first (closer = better), then by match score
        if (a.distance && b.distance) {
          if (Math.abs(a.distance - b.distance) < 1) {
            // If distance is very similar, sort by match score
            return b.match.matchScore - a.match.matchScore;
          }
          return a.distance - b.distance;
        }
        return b.match.matchScore - a.match.matchScore;
      })
      .slice(0, 10); // Top 10 nearby jobs

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
    const newMatches = topMatches.filter((m) => !appliedIds.has(m.job.id));

    if (newMatches.length === 0) {
      return { sent: false, jobCount: 0 };
    }

    // Format recommendations with distance
    const recommendations: (JobRecommendation & { distance?: number })[] = newMatches.map((m) => ({
      id: m.job.id,
      title: m.job.title,
      companyName: m.job.employer?.companyName,
      location: `${m.job.city}, ${m.job.district}, ${m.job.province}`,
      matchScore: m.match.matchScore,
      salaryMin: m.job.salaryMin || undefined,
      salaryMax: m.job.salaryMax || undefined,
      jobType: m.job.jobType,
      distance: m.distance,
    }));

    // Send email if enabled
    if (user.emailNotifications) {
      try {
        await emailService.sendNearbyJobRecommendationEmail(
          {
            email: user.email,
            firstName: user.firstName,
          },
          recommendations,
          maxDistanceKm
        );
      } catch (emailError) {
        console.error(`Error sending nearby jobs email to ${user.email}:`, emailError);
      }
    }

    // Send Socket.io notification
    const io = getSocketIOInstance();
    if (io && recommendations.length > 0) {
      const closestJob = recommendations[0]; // Closest job
      emitNotification(io, userId, {
        type: 'NEARBY_JOB_RECOMMENDATION',
        title: '📍 Nearby Jobs for You!',
        message: `We found ${recommendations.length} job${recommendations.length > 1 ? 's' : ''} within ${maxDistanceKm}km of your location. Closest: ${closestJob.title} (${closestJob.distance?.toFixed(1)}km away, ${Math.round(closestJob.matchScore)}% match)`,
        data: {
          jobCount: recommendations.length,
          maxDistance: maxDistanceKm,
          closestJob: {
            jobId: closestJob.id,
            title: closestJob.title,
            companyName: closestJob.companyName,
            distance: closestJob.distance,
            matchScore: closestJob.matchScore,
            location: closestJob.location,
          },
          allRecommendations: recommendations.map(r => ({
            jobId: r.id,
            title: r.title,
            distance: r.distance,
            matchScore: r.matchScore,
          })),
        },
      });
    }

    return { sent: true, jobCount: recommendations.length };
  } catch (error: any) {
    console.error('Error sending nearby job recommendations:', error);
    return { sent: false, jobCount: 0 };
  }
};

/**
 * Send nearby job recommendations to all eligible users
 * This can be run as a scheduled job (e.g., daily or when new jobs are posted)
 */
export const sendNearbyJobRecommendationsToAllUsers = async (
  maxDistanceKm: number = 30,
  minMatchScore: number = 40
): Promise<{ totalUsers: number; emailsSent: number; totalJobs: number }> => {
  try {
    // Get all users with approved KYC, job alerts enabled, and location coordinates
    const users = await prisma.user.findMany({
      where: {
        jobAlerts: true,
        emailNotifications: true,
        status: 'ACTIVE',
        isEmailVerified: true,
        individualKYC: {
          status: 'APPROVED',
          latitude: { not: null },
          longitude: { not: null },
        },
      },
      include: {
        individualKYC: true,
      },
      take: 500, // Limit to prevent overload
    });

    let emailsSent = 0;
    let totalJobs = 0;

    // Send recommendations to each user
    for (const user of users) {
      if (!user.individualKYC?.latitude || !user.individualKYC?.longitude) continue;
      
      const result = await sendNearbyJobRecommendations(
        user.id,
        maxDistanceKm,
        minMatchScore
      );
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
    console.error('Error sending nearby job recommendations to all users:', error);
    return {
      totalUsers: 0,
      emailsSent: 0,
      totalJobs: 0,
    };
  }
};

