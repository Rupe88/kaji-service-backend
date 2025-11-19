import { Request, Response } from 'express';
import prisma from '../config/database';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { industrialKYCSchema } from '../utils/kycValidation';

const createIndustrialKYCSchema = industrialKYCSchema;

export const createIndustrialKYC = async (req: Request, res: Response) => {
  // Parse FormData fields that might be strings
  const parsedBody: any = { ...req.body };
  
  // Parse number fields
  if (parsedBody.yearsInBusiness && typeof parsedBody.yearsInBusiness === 'string') {
    parsedBody.yearsInBusiness = parseInt(parsedBody.yearsInBusiness, 10);
  }
  
  const body = createIndustrialKYCSchema.parse(parsedBody);

  // Handle document uploads
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const documents: { [key: string]: string } = {};

  if (files.registrationCertificate?.[0]) {
    const result = await uploadToCloudinary(files.registrationCertificate[0], 'hr-platform/kyc/industrial');
    documents.registrationCertificate = result.url;
  }
  if (files.taxClearanceCertificate?.[0]) {
    const result = await uploadToCloudinary(files.taxClearanceCertificate[0], 'hr-platform/kyc/industrial');
    documents.taxClearanceCertificate = result.url;
  }
  if (files.panCertificate?.[0]) {
    const result = await uploadToCloudinary(files.panCertificate[0], 'hr-platform/kyc/industrial');
    documents.panCertificate = result.url;
  }
  if (files.vatCertificate?.[0]) {
    const result = await uploadToCloudinary(files.vatCertificate[0], 'hr-platform/kyc/industrial');
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
  });

  res.status(201).json({
    success: true,
    data: kyc,
  });
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

  res.json({
    success: true,
    data: kyc,
  });
};

export const updateIndustrialKYC = async (req: Request, res: Response) => {
  const { userId } = req.params;
  const body = req.body;

  const kyc = await prisma.industrialKYC.update({
    where: { userId },
    data: body,
  });

  res.json({
    success: true,
    data: kyc,
  });
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

  res.json({
    success: true,
    data: kyc,
  });
};

