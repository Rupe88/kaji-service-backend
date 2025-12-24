import { Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database';
import { uploadToCloudinary, fixCloudinaryUrlForPdf } from '../utils/cloudinaryUpload';
import { industrialKYCSchema } from '../utils/kycValidation';
import { updateIndustrialKYCSchema } from '../utils/updateValidation';
import { getSocketIOInstance, emitNotification, emitNotificationToAllAdmins } from '../config/socket';
import { AuthRequest } from '../middleware/auth';

const createIndustrialKYCSchema = industrialKYCSchema;

export const createIndustrialKYC = async (req: Request, res: Response) => {
  try {
    // Parse FormData fields that might be strings
    const parsedBody: any = { ...req.body };
    
    // Parse number fields - handle empty strings and convert to number or undefined
    // This must happen BEFORE validation since FormData sends everything as strings
    if (parsedBody.yearsInBusiness !== undefined && parsedBody.yearsInBusiness !== null) {
      if (typeof parsedBody.yearsInBusiness === 'string') {
        const trimmed = parsedBody.yearsInBusiness.trim();
        if (trimmed === '') {
          delete parsedBody.yearsInBusiness; // Remove empty string for optional field
        } else {
          const parsed = parseInt(trimmed, 10);
          if (!isNaN(parsed)) {
            parsedBody.yearsInBusiness = parsed;
          } else {
            delete parsedBody.yearsInBusiness; // Invalid number, treat as optional
          }
        }
      }
    } else if (parsedBody.yearsInBusiness === '') {
      delete parsedBody.yearsInBusiness; // Remove empty string
    }
    
    // Now validate after parsing
    const body = createIndustrialKYCSchema.parse(parsedBody);

    // Handle document uploads
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const documents: { [key: string]: string } = {};

    if (files.registrationCertificate?.[0]) {
      const result = await uploadToCloudinary(files.registrationCertificate[0], 'service-platform/kyc/industrial');
      documents.registrationCertificate = result.url;
    }
    if (files.taxClearanceCertificate?.[0]) {
      const result = await uploadToCloudinary(files.taxClearanceCertificate[0], 'service-platform/kyc/industrial');
      documents.taxClearanceCertificate = result.url;
    }
    if (files.panCertificate?.[0]) {
      const result = await uploadToCloudinary(files.panCertificate[0], 'service-platform/kyc/industrial');
      documents.panCertificate = result.url;
    }
    if (files.vatCertificate?.[0]) {
      const result = await uploadToCloudinary(files.vatCertificate[0], 'service-platform/kyc/industrial');
      documents.vatCertificate = result.url;
    }

    const kyc = await prisma.industrialKYC.create({
      data: {
        userId: body.userId,
        companyName: body.companyName,
        companyEmail: body.companyEmail,
        companyPhone: body.companyPhone,
        registrationNumber: body.registrationNumber,
        yearsInBusiness: body.yearsInBusiness,
        companySize: body.companySize,
        industrySector: body.industrySector,
        country: body.country,
        province: body.province,
        district: body.district,
        municipality: body.municipality,
        ward: body.ward,
        street: body.street,
        contactPersonName: body.contactPersonName,
        contactPersonDesignation: body.contactPersonDesignation,
        contactPersonPhone: body.contactPersonPhone,
        registrationCertificate: documents.registrationCertificate || '',
        taxClearanceCertificate: documents.taxClearanceCertificate || '',
        panCertificate: documents.panCertificate || '',
        vatCertificate: documents.vatCertificate,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Notify all admins about new KYC submission
    const io = getSocketIOInstance();
    if (io) {
      const userName = kyc.user.firstName && kyc.user.lastName
        ? `${kyc.user.firstName} ${kyc.user.lastName}`
        : kyc.user.email;
      
      await emitNotificationToAllAdmins(io, {
        type: 'KYC_SUBMITTED',
        title: 'New Industrial KYC Submission',
        message: `${userName} (${kyc.companyName}) has submitted a new Industrial KYC application for review.`,
        data: {
          kycType: 'INDUSTRIAL',
          userId: kyc.userId,
          companyName: kyc.companyName,
          status: kyc.status,
        },
      });
    }

    return res.status(201).json({
      success: true,
      data: kyc,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error creating industrial KYC:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create industrial KYC',
    });
  }
};

export const getIndustrialKYC = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const kyc = await prisma.industrialKYC.findUnique({
    where: { userId },
    include: {
      jobPostings: {
        where: { isActive: true },
      },
    },
  });

  if (!kyc) {
    res.status(404).json({
      success: false,
      message: 'Industrial KYC not found',
    });
    return;
  }

      // Fix PDF URLs for all certificate documents
      const fixedKyc = {
        ...kyc,
        registrationCertificate: kyc.registrationCertificate ? fixCloudinaryUrlForPdf(kyc.registrationCertificate) : kyc.registrationCertificate,
        taxClearanceCertificate: kyc.taxClearanceCertificate ? fixCloudinaryUrlForPdf(kyc.taxClearanceCertificate) : kyc.taxClearanceCertificate,
        panCertificate: kyc.panCertificate ? fixCloudinaryUrlForPdf(kyc.panCertificate) : kyc.panCertificate,
        vatCertificate: kyc.vatCertificate ? fixCloudinaryUrlForPdf(kyc.vatCertificate) : kyc.vatCertificate,
      };

      // Set cache-control headers to prevent stale data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });

      console.log('📋 Industrial KYC fetched for user:', userId);
      console.log('📋 KYC Status:', fixedKyc.status);
      console.log('📋 Has certificates:', {
        registration: !!fixedKyc.registrationCertificate,
        tax: !!fixedKyc.taxClearanceCertificate,
        pan: !!fixedKyc.panCertificate,
        vat: !!fixedKyc.vatCertificate,
      });

      res.json({
        success: true,
        data: fixedKyc,
      });
};

export const updateIndustrialKYC = async (req: Request, res: Response) => {
  const { userId } = req.params;
  
  try {
    // Parse FormData fields that might be strings
    const parsedBody: any = { ...req.body };
    
    // Parse number fields - handle empty strings and convert to number or undefined
    // This must happen BEFORE validation since FormData sends everything as strings
    if (parsedBody.yearsInBusiness !== undefined && parsedBody.yearsInBusiness !== null) {
      if (typeof parsedBody.yearsInBusiness === 'string') {
        const trimmed = parsedBody.yearsInBusiness.trim();
        if (trimmed === '') {
          delete parsedBody.yearsInBusiness; // Remove empty string for optional field
        } else {
          const parsed = parseInt(trimmed, 10);
          if (!isNaN(parsed)) {
            parsedBody.yearsInBusiness = parsed;
          } else {
            delete parsedBody.yearsInBusiness; // Invalid number, treat as optional
          }
        }
      }
    } else if (parsedBody.yearsInBusiness === '') {
      delete parsedBody.yearsInBusiness; // Remove empty string
    }
    
    // Validate with update schema
    const body = updateIndustrialKYCSchema.parse(parsedBody);

    const kyc = await prisma.industrialKYC.update({
      where: { userId },
      data: body,
    });

    return res.json({
      success: true,
      data: kyc,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    console.error('Error updating industrial KYC:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update industrial KYC',
    });
  }
};

export const getAllIndustrialKYC = async (req: Request, res: Response) => {
  const { status, province, district, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (status) where.status = status;
  if (province) where.province = province;
  if (district) where.district = district;

  const [kycs, total] = await Promise.all([
    prisma.industrialKYC.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.industrialKYC.count({ where }),
  ]);

  res.json({
    success: true,
    data: kycs,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const updateKYCStatus = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status, rejectionReason, adminNotes, verifiedBy } = req.body;

  // Get current KYC to check if status is changing
  const currentKYC = await prisma.industrialKYC.findUnique({
    where: { userId },
    select: { status: true },
  });

  const kyc = await prisma.industrialKYC.update({
    where: { userId },
    data: {
      status,
      rejectionReason,
      adminNotes,
      verifiedBy,
      verifiedAt: status === 'APPROVED' ? new Date() : undefined,
    },
  });

  // Emit notification if status changed
  const io = getSocketIOInstance();
  if (io && currentKYC && currentKYC.status !== status) {
    let title = 'KYC Status Updated';
    let message = `Your Industrial KYC has been ${status}`;

    if (status === 'APPROVED') {
      title = 'KYC Approved! 🎉';
      message = 'Congratulations! Your Industrial KYC has been approved. You can now post jobs.';
    } else if (status === 'REJECTED') {
      title = 'KYC Rejected';
      message = rejectionReason 
        ? `Your Industrial KYC was rejected: ${rejectionReason}`
        : 'Your Industrial KYC was rejected. Please review and resubmit.';
    } else if (status === 'RESUBMITTED') {
      title = 'KYC Resubmitted';
      message = 'Your Industrial KYC has been resubmitted and is under review.';
    }

    await emitNotification(io, userId, {
      type: 'KYC_STATUS',
      title,
      message,
      data: {
        kycType: 'INDUSTRIAL',
        status,
        rejectionReason: rejectionReason || undefined,
        verifiedAt: kyc.verifiedAt?.toISOString(),
      },
    });
  }

  res.json({
    success: true,
    data: kyc,
  });
};

export const deleteIndustrialKYC = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { userId } = req.params;

  // Users can only delete their own KYC
  if (req.user.id !== userId) {
    res.status(403).json({ success: false, message: 'You can only delete your own KYC' });
    return;
  }

  // Check if KYC exists
  const kyc = await prisma.industrialKYC.findUnique({
    where: { userId },
  });

  if (!kyc) {
    res.status(404).json({ success: false, message: 'KYC not found' });
    return;
  }

  // Only allow deletion if status is PENDING or REJECTED (not APPROVED)
  if (kyc.status === 'APPROVED') {
    res.status(400).json({ 
      success: false, 
      message: 'Cannot delete approved KYC. Please contact admin if you need to make changes.' 
    });
    return;
  }

  // Delete the KYC
  await prisma.industrialKYC.delete({
    where: { userId },
  });

  res.json({
    success: true,
    message: 'KYC deleted successfully',
  });
};

