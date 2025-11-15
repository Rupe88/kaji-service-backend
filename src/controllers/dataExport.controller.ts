import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const exportJobPostings = async (req: Request, res: Response) => {
  const { employerId, format = 'json' } = req.query;

  const where: any = {};
  if (employerId) where.employerId = employerId;

  const jobs = await prisma.jobPosting.findMany({
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
          applications: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (format === 'csv') {
    // Convert to CSV
    const headers = ['ID', 'Title', 'Company', 'Type', 'Location', 'Salary Min', 'Salary Max', 'Applications', 'Created At'];
    const rows = jobs.map((job) => [
      job.id,
      job.title,
      job.employer.companyName,
      job.jobType,
      `${job.province}, ${job.district}`,
      job.salaryMin || '',
      job.salaryMax || '',
      job._count.applications,
      job.createdAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=job-postings.csv');
    res.send(csv);
    return;
  }

  // Default JSON export
  res.json({
    success: true,
    data: jobs,
    count: jobs.length,
  });
};

export const exportApplications = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { jobId, applicantId, format = 'json' } = req.query;

  const where: any = {};
  if (jobId) where.jobId = jobId;
  if (applicantId) where.applicantId = applicantId;

  // If not admin, only show own applications or jobs
  if (req.user.role !== 'ADMIN') {
    if (applicantId && applicantId !== req.user.id) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    if (!applicantId) {
      where.applicantId = req.user.id;
    }
  }

  const applications = await prisma.jobApplication.findMany({
    where,
    include: {
      job: {
        select: {
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
          fullName: true,
          email: true,
        },
      },
    },
    orderBy: { appliedAt: 'desc' },
  });

  if (format === 'csv') {
    const headers = ['ID', 'Job Title', 'Company', 'Applicant', 'Email', 'Status', 'Applied At'];
    const rows = applications.map((app) => [
      app.id,
      app.job.title,
      app.job.employer.companyName,
      app.applicant.fullName,
      app.applicant.email,
      app.status,
      app.appliedAt.toISOString(),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
    res.send(csv);
    return;
  }

  res.json({
    success: true,
    data: applications,
    count: applications.length,
  });
};

export const exportKYCs = async (req: AuthRequest, res: Response) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }

  const { type = 'individual', status, format = 'json' } = req.query;

  if (type === 'individual') {
    const where: any = {};
    if (status) where.status = status;

    const kycs = await prisma.individualKYC.findMany({
      where,
      select: {
        id: true,
        userId: true,
        fullName: true,
        email: true,
        phone: true,
        province: true,
        district: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = ['ID', 'User ID', 'Full Name', 'Email', 'Phone', 'Province', 'District', 'Status', 'Created At'];
      const rows = kycs.map((kyc) => [
        kyc.id,
        kyc.userId,
        kyc.fullName,
        kyc.email,
        kyc.phone,
        kyc.province,
        kyc.district,
        kyc.status,
        kyc.createdAt.toISOString(),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=individual-kycs.csv');
      res.send(csv);
      return;
    }

    res.json({
      success: true,
      data: kycs,
      count: kycs.length,
    });
  } else {
    const where: any = {};
    if (status) where.status = status;

    const kycs = await prisma.industrialKYC.findMany({
      where,
      select: {
        id: true,
        userId: true,
        companyName: true,
        companyEmail: true,
        companyPhone: true,
        province: true,
        district: true,
        status: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (format === 'csv') {
      const headers = ['ID', 'User ID', 'Company Name', 'Email', 'Phone', 'Province', 'District', 'Status', 'Created At'];
      const rows = kycs.map((kyc) => [
        kyc.id,
        kyc.userId,
        kyc.companyName,
        kyc.companyEmail,
        kyc.companyPhone,
        kyc.province,
        kyc.district,
        kyc.status,
        kyc.createdAt.toISOString(),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=industrial-kycs.csv');
      res.send(csv);
      return;
    }

    res.json({
      success: true,
      data: kycs,
      count: kycs.length,
    });
  }
};

