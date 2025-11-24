import { Request, Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export const exportJobPostings = async (req: Request, res: Response) => {
  try {
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
    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    // Convert to CSV
    const headers = ['ID', 'Title', 'Company', 'Type', 'Location', 'Salary Min', 'Salary Max', 'Applications', 'Created At'];
    const rows = jobs.map((job) => [
      escapeCSV(job.id),
      escapeCSV(job.title),
      escapeCSV(job.employer?.companyName || ''),
      escapeCSV(job.jobType),
      escapeCSV(`${job.province || ''}, ${job.district || ''}`),
      escapeCSV(job.salaryMin || ''),
      escapeCSV(job.salaryMax || ''),
      escapeCSV(job._count.applications),
      escapeCSV(job.createdAt.toISOString()),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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
  } catch (error: any) {
    console.error('Error exporting job postings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export job postings',
      error: error.message,
    });
  }
};

export const exportApplications = async (req: AuthRequest, res: Response) => {
  try {
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
    // Helper function to escape CSV values
    const escapeCSV = (value: any): string => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const headers = ['ID', 'Job Title', 'Company', 'Applicant', 'Email', 'Status', 'Applied At'];
    const rows = applications.map((app) => [
      escapeCSV(app.id),
      escapeCSV(app.job?.title || ''),
      escapeCSV(app.job?.employer?.companyName || ''),
      escapeCSV(app.applicant?.fullName || ''),
      escapeCSV(app.applicant?.email || ''),
      escapeCSV(app.status),
      escapeCSV(app.appliedAt.toISOString()),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=applications.csv');
    res.send(csv);
    return;
  }

    res.json({
      success: true,
      data: applications,
      count: applications.length,
    });
  } catch (error: any) {
    console.error('Error exporting applications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export applications',
      error: error.message,
    });
  }
};

export const exportKYCs = async (req: AuthRequest, res: Response) => {
  try {
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
      // Helper function to escape CSV values
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const headers = ['ID', 'User ID', 'Full Name', 'Email', 'Phone', 'Province', 'District', 'Status', 'Created At'];
      const rows = kycs.map((kyc) => [
        escapeCSV(kyc.id),
        escapeCSV(kyc.userId),
        escapeCSV(kyc.fullName),
        escapeCSV(kyc.email),
        escapeCSV(kyc.phone),
        escapeCSV(kyc.province),
        escapeCSV(kyc.district),
        escapeCSV(kyc.status),
        escapeCSV(kyc.createdAt.toISOString()),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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
      // Helper function to escape CSV values
      const escapeCSV = (value: any): string => {
        if (value === null || value === undefined) return '';
        const stringValue = String(value);
        // Escape quotes by doubling them and wrap in quotes if contains comma, quote, or newline
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      };

      const headers = ['ID', 'User ID', 'Company Name', 'Email', 'Phone', 'Province', 'District', 'Status', 'Created At'];
      const rows = kycs.map((kyc) => [
        escapeCSV(kyc.id),
        escapeCSV(kyc.userId),
        escapeCSV(kyc.companyName),
        escapeCSV(kyc.companyEmail),
        escapeCSV(kyc.companyPhone),
        escapeCSV(kyc.province),
        escapeCSV(kyc.district),
        escapeCSV(kyc.status),
        escapeCSV(kyc.createdAt.toISOString()),
      ]);

      const csv = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
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
  } catch (error: any) {
    console.error('Error exporting KYCs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export KYCs',
      error: error.message,
    });
  }
};

