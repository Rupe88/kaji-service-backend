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

  const [
    totalJobs,
    activeJobs,
    totalApplications,
    jobsByType,
    jobsByLocation,
    avgSalary,
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
  ]);

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

  const [
    totalApplications,
    applicationsByStatus,
    totalTrainings,
    completedTrainings,
    totalExams,
    passedExams,
    totalCertifications,
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
  ]);

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

