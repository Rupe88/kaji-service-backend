import { Request, Response } from 'express';
import prisma from '../config/database';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '../utils/cloudinaryUpload';
import { z } from 'zod';
import { randomBytes } from 'crypto';

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
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  let certificateUrl = '';
  
  if (files?.certificate?.[0]) {
    const uploadResult = await uploadToCloudinary(files.certificate[0], 'hr-platform/certificates');
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
      const uploads = await uploadMultipleToCloudinary(files.practiceVideos, 'hr-platform/certificates/practice');
      practiceVideos = uploads.map((u) => u.url);
    }
    if (files.practicePhotos) {
      const uploads = await uploadMultipleToCloudinary(files.practicePhotos, 'hr-platform/certificates/practice');
      practicePhotos = uploads.map((u) => u.url);
    }
    if (files.orientationVideos) {
      const uploads = await uploadMultipleToCloudinary(files.orientationVideos, 'hr-platform/certificates/orientation');
      orientationVideos = uploads.map((u) => u.url);
    }
    if (files.orientationPhotos) {
      const uploads = await uploadMultipleToCloudinary(files.orientationPhotos, 'hr-platform/certificates/orientation');
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
      practiceVideos: practiceVideos.length > 0 ? practiceVideos : body.practiceVideos,
      practicePhotos: practicePhotos.length > 0 ? practicePhotos : body.practicePhotos,
      orientationVideos: orientationVideos.length > 0 ? orientationVideos : body.orientationVideos,
      orientationPhotos: orientationPhotos.length > 0 ? orientationPhotos : body.orientationPhotos,
    },
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

  res.json({
    success: true,
    data: certifications,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
};

