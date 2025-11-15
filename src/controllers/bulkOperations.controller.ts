import { Response } from 'express';
import prisma from '../config/database';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';

// Bulk delete schema
const bulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required').max(100, 'Cannot delete more than 100 items at once'),
});

// Bulk update status schema
const bulkUpdateStatusSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, 'At least one ID is required').max(100, 'Cannot update more than 100 items at once'),
  status: z.string(),
  rejectionReason: z.string().optional(),
  adminNotes: z.string().optional(),
  verifiedBy: z.string().optional(),
});

// Bulk create job postings
const bulkCreateJobsSchema = z.object({
  jobs: z.array(z.any()).min(1, 'At least one job is required').max(50, 'Cannot create more than 50 jobs at once'),
});

export const bulkDeleteJobPostings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const body = bulkDeleteSchema.parse(req.body);

  // Use transaction for bulk operations
  const result = await prisma.$transaction(async (tx) => {
    const deleted = await tx.jobPosting.updateMany({
      where: {
        id: { in: body.ids },
        employerId: req.user!.id, // Only allow deleting own jobs
      },
      data: { isActive: false },
    });

    return deleted;
  });

  res.json({
    success: true,
    message: `${result.count} job posting(s) deactivated`,
    count: result.count,
  });
};

export const bulkUpdateKYCStatus = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  // Only admins can bulk update KYC status
  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }

  const body = bulkUpdateStatusSchema.parse(req.body);

  const result = await prisma.$transaction(async (tx) => {
    const updateData: any = {
      status: body.status,
      rejectionReason: body.rejectionReason,
      adminNotes: body.adminNotes,
      verifiedBy: body.verifiedBy || req.user!.id,
    };

    if (body.status === 'APPROVED') {
      updateData.verifiedAt = new Date();
    }

    const [individual, industrial] = await Promise.all([
      tx.individualKYC.updateMany({
        where: { userId: { in: body.ids } },
        data: updateData,
      }),
      tx.industrialKYC.updateMany({
        where: { userId: { in: body.ids } },
        data: updateData,
      }),
    ]);

    return {
      individual: individual.count,
      industrial: industrial.count,
      total: individual.count + industrial.count,
    };
  });

  res.json({
    success: true,
    message: `Updated status for ${result.total} KYC profile(s)`,
    data: result,
  });
};

export const bulkCreateJobPostings = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const body = bulkCreateJobsSchema.parse(req.body);

  // Verify employer exists and is approved
  const employer = await prisma.industrialKYC.findUnique({
    where: { userId: req.user.id },
  });

  if (!employer || employer.status !== 'APPROVED') {
    res.status(403).json({
      success: false,
      message: 'Employer KYC must be approved to post jobs',
    });
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const jobs = body.jobs.map((job) => ({
      ...job,
      employerId: req.user!.id,
      expiresAt: job.expiresAt ? new Date(job.expiresAt) : undefined,
    }));

    const created = await tx.jobPosting.createMany({
      data: jobs,
      skipDuplicates: true,
    });

    return created;
  });

  res.status(201).json({
    success: true,
    message: `Created ${result.count} job posting(s)`,
    count: result.count,
  });
};

