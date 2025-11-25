import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  fixCloudinaryUrlForPdf,
} from '../utils/cloudinaryUpload';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { getSocketIOInstance, emitNotification } from '../config/socket';
import emailService from '../services/email.service';

const createCertificationSchema = z.object({
  userId: z.string().uuid(),
  examBookingId: z.string().uuid().optional(),
  title: z.string().min(1),
  category: z.string(),
  issuedDate: z.string().datetime(),
  expiryDate: z.string().datetime().optional(),
  practiceVideos: z.any().optional(),
  practicePhotos: z.any().optional(),
  orientationVideos: z.any().optional(),
  orientationPhotos: z.any().optional(),
});

const generateCertificateNumber = (): string => {
  const prefix = 'CERT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = randomBytes(4).toString('hex').toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

const generateVerificationCode = (): string => {
  return randomBytes(16).toString('hex').toUpperCase();
};

export const createCertification = async (req: Request, res: Response) => {
  const body = createCertificationSchema.parse(req.body);

  // Verify user exists
  const user = await prisma.individualKYC.findUnique({
    where: { userId: body.userId },
  });

  if (!user) {
    res.status(404).json({
      success: false,
      message: 'User not found',
    });
    return;
  }

  // Handle certificate file upload
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;
  let certificateUrl = '';

  if (files?.certificate?.[0]) {
    const uploadResult = await uploadToCloudinary(
      files.certificate[0],
      'hr-platform/certificates'
    );
    // New uploads with resource_type: 'raw' will already have correct URL
    // No need to fix for new uploads
    certificateUrl = uploadResult.url;
  } else {
    res.status(400).json({
      success: false,
      message: 'Certificate file is required',
    });
    return;
  }

  // Handle practice and orientation media if provided
  let practiceVideos: string[] = [];
  let practicePhotos: string[] = [];
  let orientationVideos: string[] = [];
  let orientationPhotos: string[] = [];

  if (files) {
    if (files.practiceVideos) {
      const uploads = await uploadMultipleToCloudinary(
        files.practiceVideos,
        'hr-platform/certificates/practice'
      );
      practiceVideos = uploads.map((u) => u.url);
    }
    if (files.practicePhotos) {
      const uploads = await uploadMultipleToCloudinary(
        files.practicePhotos,
        'hr-platform/certificates/practice'
      );
      practicePhotos = uploads.map((u) => u.url);
    }
    if (files.orientationVideos) {
      const uploads = await uploadMultipleToCloudinary(
        files.orientationVideos,
        'hr-platform/certificates/orientation'
      );
      orientationVideos = uploads.map((u) => u.url);
    }
    if (files.orientationPhotos) {
      const uploads = await uploadMultipleToCloudinary(
        files.orientationPhotos,
        'hr-platform/certificates/orientation'
      );
      orientationPhotos = uploads.map((u) => u.url);
    }
  }

  const certificate = await prisma.certification.create({
    data: {
      ...body,
      certificateNumber: generateCertificateNumber(),
      verificationCode: generateVerificationCode(),
      certificateUrl,
      issuedDate: new Date(body.issuedDate),
      expiryDate: body.expiryDate ? new Date(body.expiryDate) : undefined,
      practiceVideos:
        practiceVideos.length > 0 ? practiceVideos : body.practiceVideos,
      practicePhotos:
        practicePhotos.length > 0 ? practicePhotos : body.practicePhotos,
      orientationVideos:
        orientationVideos.length > 0
          ? orientationVideos
          : body.orientationVideos,
      orientationPhotos:
        orientationPhotos.length > 0
          ? orientationPhotos
          : body.orientationPhotos,
    },
    include: {
      individual: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
            },
          },
        },
      },
    },
  });

  // Send Socket.io notification
  const io = getSocketIOInstance();
  if (io && certificate.individual?.user) {
    const issuedDateFormatted = new Date(
      certificate.issuedDate
    ).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await emitNotification(io, certificate.individual.userId, {
      type: 'CERTIFICATION_CREATED',
      title: 'New Certification Awarded! 🏆',
      message: `Congratulations! You have been awarded a certification: "${certificate.title}". Issued on ${issuedDateFormatted}`,
      data: {
        certificationId: certificate.id,
        certificateTitle: certificate.title,
        certificateNumber: certificate.certificateNumber,
        verificationCode: certificate.verificationCode,
        issuedDate: certificate.issuedDate.toISOString(),
        expiryDate: certificate.expiryDate?.toISOString(),
        certificateUrl: certificate.certificateUrl,
      },
    });
    console.log(
      `📬 Socket.io: Certification notification sent to user ${certificate.individual.userId}`
    );
  }

  // Send email notification (async, don't wait)
  if (certificate.individual?.user?.email) {
    emailService
      .sendCertificationCreatedEmail(
        {
          email: certificate.individual.user.email,
          firstName:
            certificate.individual.fullName?.split(' ')[0] || undefined,
        },
        {
          certificateTitle: certificate.title,
          category: certificate.category,
          certificateNumber: certificate.certificateNumber,
          verificationCode: certificate.verificationCode,
          issuedDate: certificate.issuedDate.toISOString(),
          expiryDate: certificate.expiryDate?.toISOString(),
          certificateUrl: certificate.certificateUrl,
        }
      )
      .catch((error) => {
        console.error('Error sending certification email:', error);
      });
  }

  res.status(201).json({
    success: true,
    data: certificate,
  });
};

export const getCertification = async (req: Request, res: Response) => {
  const { id } = req.params;

  const certification = await prisma.certification.findUnique({
    where: { id },
    include: {
      individual: {
        select: {
          userId: true,
          fullName: true,
          email: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  if (!certification) {
    res.status(404).json({
      success: false,
      message: 'Certification not found',
    });
    return;
  }

  // Fix certificate URL if it's a PDF with incorrect resource type
  if (certification.certificateUrl) {
    certification.certificateUrl = fixCloudinaryUrlForPdf(
      certification.certificateUrl
    );
  }

  res.json({
    success: true,
    data: certification,
  });
};

export const verifyCertification = async (req: Request, res: Response) => {
  const { verificationCode } = req.query;

  if (!verificationCode) {
    res.status(400).json({
      success: false,
      message: 'Verification code is required',
    });
    return;
  }

  const certification = await prisma.certification.findUnique({
    where: { verificationCode: verificationCode as string },
    include: {
      individual: {
        select: {
          userId: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!certification) {
    res.status(404).json({
      success: false,
      message: 'Certification not found or invalid verification code',
    });
    return;
  }

  // Fix certificate URL if it's a PDF with incorrect resource type
  if (certification.certificateUrl) {
    certification.certificateUrl = fixCloudinaryUrlForPdf(
      certification.certificateUrl
    );
  }

  res.json({
    success: true,
    data: certification,
    verified: certification.isVerified,
  });
};

export const getUserCertifications = async (req: Request, res: Response) => {
  const { userId, category, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = { userId };
  if (category) where.category = category;

  const [certifications, total] = await Promise.all([
    prisma.certification.findMany({
      where,
      skip,
      take,
      orderBy: { issuedDate: 'desc' },
    }),
    prisma.certification.count({ where }),
  ]);

  // Fix certificate URLs for all certifications
  const fixedCertifications = certifications.map((cert) => ({
    ...cert,
    certificateUrl: cert.certificateUrl
      ? fixCloudinaryUrlForPdf(cert.certificateUrl)
      : cert.certificateUrl,
  }));

  res.json({
    success: true,
    data: fixedCertifications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const getAllCertifications = async (req: Request, res: Response) => {
  const { userId, category, page = '1', limit = '20' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (userId) where.userId = userId;
  if (category) where.category = category;

  const [certifications, total] = await Promise.all([
    prisma.certification.findMany({
      where,
      skip,
      take,
      include: {
        individual: {
          select: {
            userId: true,
            fullName: true,
            email: true,
            profilePhotoUrl: true,
          },
        },
      },
      orderBy: { issuedDate: 'desc' },
    }),
    prisma.certification.count({ where }),
  ]);

  // Fix certificate URLs for all certifications
  const fixedCertifications = certifications.map((cert) => ({
    ...cert,
    certificateUrl: cert.certificateUrl
      ? fixCloudinaryUrlForPdf(cert.certificateUrl)
      : cert.certificateUrl,
  }));

  res.json({
    success: true,
    data: fixedCertifications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

export const deleteCertification = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const certification = await prisma.certification.findUnique({
      where: { id },
    });

    if (!certification) {
      res.status(404).json({
        success: false,
        message: 'Certification not found',
      });
      return;
    }

    // Delete the certification
    await prisma.certification.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Certification deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting certification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete certification',
      error: error.message,
    });
  }
};
