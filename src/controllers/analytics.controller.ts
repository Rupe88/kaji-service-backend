import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const getJobStatistics = async (req: Request, res: Response) => {
  const { employerId, startDate, endDate } = req.query;

  const where: any = {};
  if (employerId) where.employerId = employerId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate as string);
    if (endDate) where.createdAt.lte = new Date(endDate as string);
  }

  // Get last 30 days for time-series data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalJobs,
    activeJobs,
    totalApplications,
    jobsByType,
    jobsByLocation,
    avgSalary,
    jobsData,
    applicationsData,
    applicationsByStatus,
  ] = await Promise.all([
    prisma.jobPosting.count({ where }),
    prisma.jobPosting.count({ where: { ...where, isActive: true } }),
    prisma.jobApplication.count({
      where: {
        job: where,
      },
    }),
    prisma.jobPosting.groupBy({
      by: ['jobType'],
      where,
      _count: { id: true },
    }),
    prisma.jobPosting.groupBy({
      by: ['province', 'district'],
      where,
      _count: { id: true },
    }),
    prisma.jobPosting.aggregate({
      where,
      _avg: {
        salaryMin: true,
        salaryMax: true,
      },
    }),
    prisma.jobPosting.findMany({
      where: {
        ...where,
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true },
    }),
    prisma.jobApplication.findMany({
      where: {
        job: {
          ...where,
        },
        appliedAt: { gte: thirtyDaysAgo },
      },
      select: { appliedAt: true },
    }),
    prisma.jobApplication.groupBy({
      by: ['status'],
      where: {
        job: where,
      },
      _count: { id: true },
    }),
  ]);

  // Generate time-series data
  const dateMap = new Map<string, { jobs: number; applications: number }>();
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];
    dateMap.set(dateKey, { jobs: 0, applications: 0 });
  }

  jobsData.forEach((job) => {
    const dateKey = new Date(job.createdAt).toISOString().split('T')[0];
    const existing = dateMap.get(dateKey);
    if (existing) {
      existing.jobs++;
    }
  });

  applicationsData.forEach((app) => {
    const dateKey = new Date(app.appliedAt).toISOString().split('T')[0];
    const existing = dateMap.get(dateKey);
    if (existing) {
      existing.applications++;
    }
  });

  const timeSeries = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  res.json({
    success: true,
    data: {
      totalJobs,
      activeJobs,
      totalApplications,
      jobsByType: jobsByType.map((j) => ({
        type: j.jobType,
        count: j._count.id,
      })),
      jobsByLocation: jobsByLocation.map((j) => ({
        province: j.province,
        district: j.district,
        count: j._count.id,
      })),
      averageSalary: {
        min: avgSalary._avg.salaryMin,
        max: avgSalary._avg.salaryMax,
      },
      charts: {
        timeSeries,
        jobsByType: jobsByType.map((j) => ({
          type: j.jobType,
          count: j._count.id,
        })),
        applicationsByStatus: applicationsByStatus.map((a) => ({
          status: a.status,
          count: a._count.id,
        })),
      },
    },
  });
};

export const getUserStatistics = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { userId } = req.params;
  const targetUserId = userId || req.user.id;

  // Only allow users to view their own stats or admins to view any
  if (targetUserId !== req.user.id && req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  // Get last 30 days for time-series data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const [
    totalApplications,
    applicationsByStatus,
    totalTrainings,
    completedTrainings,
    totalExams,
    passedExams,
    totalCertifications,
    applicationsData,
    trainingsData,
  ] = await Promise.all([
    prisma.jobApplication.count({ where: { applicantId: targetUserId } }),
    prisma.jobApplication.groupBy({
      by: ['status'],
      where: { applicantId: targetUserId },
      _count: { id: true },
    }),
    prisma.trainingEnrollment.count({ where: { userId: targetUserId } }),
    prisma.trainingEnrollment.count({
      where: { userId: targetUserId, status: 'COMPLETED' },
    }),
    prisma.examBooking.count({ where: { userId: targetUserId } }),
    prisma.examBooking.count({
      where: { userId: targetUserId, status: 'PASSED' },
    }),
    prisma.certification.count({ where: { userId: targetUserId } }),
    prisma.jobApplication.findMany({
      where: {
        applicantId: targetUserId,
        appliedAt: { gte: thirtyDaysAgo },
      },
      select: { appliedAt: true, status: true },
    }),
    prisma.trainingEnrollment.findMany({
      where: {
        userId: targetUserId,
        enrolledAt: { gte: thirtyDaysAgo },
      },
      select: { enrolledAt: true, status: true },
    }),
  ]);

  // Generate time-series data for applications
  const dateMap = new Map<string, { applications: number; trainings: number }>();
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateKey = date.toISOString().split('T')[0];
    dateMap.set(dateKey, { applications: 0, trainings: 0 });
  }

  applicationsData.forEach((app) => {
    const dateKey = new Date(app.appliedAt).toISOString().split('T')[0];
    const existing = dateMap.get(dateKey);
    if (existing) {
      existing.applications++;
    }
  });

  trainingsData.forEach((training) => {
    const dateKey = new Date(training.enrolledAt).toISOString().split('T')[0];
    const existing = dateMap.get(dateKey);
    if (existing) {
      existing.trainings++;
    }
  });

  const timeSeries = Array.from(dateMap.entries()).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  res.json({
    success: true,
    data: {
      applications: {
        total: totalApplications,
        byStatus: applicationsByStatus.map((a) => ({
          status: a.status,
          count: a._count.id,
        })),
      },
      trainings: {
        total: totalTrainings,
        completed: completedTrainings,
        inProgress: totalTrainings - completedTrainings,
      },
      exams: {
        total: totalExams,
        passed: passedExams,
        passRate: totalExams > 0 ? (passedExams / totalExams) * 100 : 0,
      },
      certifications: {
        total: totalCertifications,
      },
      charts: {
        timeSeries,
        applicationsByStatus: applicationsByStatus.map((a) => ({
          status: a.status,
          count: a._count.id,
        })),
      },
    },
  });
};

export const getPlatformStatistics = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }

  const [
    totalUsers,
    activeUsers,
    totalIndividualKYC,
    approvedIndividualKYC,
    totalIndustrialKYC,
    approvedIndustrialKYC,
    totalJobs,
    activeJobs,
    totalApplications,
    totalTrainings,
    totalExams,
    totalEvents,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: 'ACTIVE' } }),
    prisma.individualKYC.count(),
    prisma.individualKYC.count({ where: { status: 'APPROVED' } }),
    prisma.industrialKYC.count(),
    prisma.industrialKYC.count({ where: { status: 'APPROVED' } }),
    prisma.jobPosting.count(),
    prisma.jobPosting.count({ where: { isActive: true } }),
    prisma.jobApplication.count(),
    prisma.trainingCourse.count(),
    prisma.exam.count(),
    prisma.event.count(),
  ]);

  res.json({
    success: true,
    data: {
      users: {
        total: totalUsers,
        active: activeUsers,
      },
      kyc: {
        individual: {
          total: totalIndividualKYC,
          approved: approvedIndividualKYC,
          approvalRate: totalIndividualKYC > 0 ? (approvedIndividualKYC / totalIndividualKYC) * 100 : 0,
        },
        industrial: {
          total: totalIndustrialKYC,
          approved: approvedIndustrialKYC,
          approvalRate: totalIndustrialKYC > 0 ? (approvedIndustrialKYC / totalIndustrialKYC) * 100 : 0,
        },
      },
      jobs: {
        total: totalJobs,
        active: activeJobs,
        totalApplications,
      },
      trainings: {
        total: totalTrainings,
      },
      exams: {
        total: totalExams,
      },
      events: {
        total: totalEvents,
      },
    },
  });
};

