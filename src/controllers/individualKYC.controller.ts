import { Request, Response } from 'express';
import prisma from '../config/database';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { AuthRequest } from '../middleware/auth';
import { individualKYCSchema } from '../utils/kycValidation';
import { updateIndividualKYCSchema } from '../utils/updateValidation';

const createIndividualKYCSchema = individualKYCSchema;

export const createIndividualKYC = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  // Parse FormData fields that might be JSON strings
  const parsedBody: any = { ...req.body };
  
  // Parse array fields that come as JSON strings from FormData
  if (typeof parsedBody.languagesKnown === 'string') {
    try {
      parsedBody.languagesKnown = JSON.parse(parsedBody.languagesKnown);
    } catch (e) {
      // If parsing fails, keep as string and let validation handle it
    }
  }
  if (typeof parsedBody.externalCertifications === 'string') {
    try {
      parsedBody.externalCertifications = JSON.parse(parsedBody.externalCertifications);
    } catch (e) {}
  }
  if (typeof parsedBody.experience === 'string') {
    try {
      parsedBody.experience = JSON.parse(parsedBody.experience);
    } catch (e) {}
  }
  if (typeof parsedBody.technicalSkills === 'string') {
    try {
      parsedBody.technicalSkills = JSON.parse(parsedBody.technicalSkills);
    } catch (e) {}
  }
  if (typeof parsedBody.softSkills === 'string') {
    try {
      parsedBody.softSkills = JSON.parse(parsedBody.softSkills);
    } catch (e) {}
  }
  if (typeof parsedBody.physicalSkills === 'string') {
    try {
      parsedBody.physicalSkills = JSON.parse(parsedBody.physicalSkills);
    } catch (e) {}
  }
  if (typeof parsedBody.interestDomains === 'string') {
    try {
      parsedBody.interestDomains = JSON.parse(parsedBody.interestDomains);
    } catch (e) {}
  }
  if (typeof parsedBody.workStylePrefs === 'string') {
    try {
      parsedBody.workStylePrefs = JSON.parse(parsedBody.workStylePrefs);
    } catch (e) {}
  }
  if (typeof parsedBody.psychometricData === 'string') {
    try {
      parsedBody.psychometricData = JSON.parse(parsedBody.psychometricData);
    } catch (e) {}
  }
  if (typeof parsedBody.motivationTriggers === 'string') {
    try {
      parsedBody.motivationTriggers = JSON.parse(parsedBody.motivationTriggers);
    } catch (e) {}
  }
  if (typeof parsedBody.learningPrefs === 'string') {
    try {
      parsedBody.learningPrefs = JSON.parse(parsedBody.learningPrefs);
    } catch (e) {}
  }
  if (typeof parsedBody.areasImprovement === 'string') {
    try {
      parsedBody.areasImprovement = JSON.parse(parsedBody.areasImprovement);
    } catch (e) {}
  }
  if (typeof parsedBody.references === 'string') {
    try {
      parsedBody.references = JSON.parse(parsedBody.references);
    } catch (e) {}
  }
  if (typeof parsedBody.portfolioUrls === 'string') {
    try {
      parsedBody.portfolioUrls = JSON.parse(parsedBody.portfolioUrls);
    } catch (e) {}
  }
  if (typeof parsedBody.socialMediaUrls === 'string') {
    try {
      parsedBody.socialMediaUrls = JSON.parse(parsedBody.socialMediaUrls);
    } catch (e) {}
  }
  
  // Parse boolean fields
  if (typeof parsedBody.willingRelocate === 'string') {
    parsedBody.willingRelocate = parsedBody.willingRelocate === 'true';
  }
  if (typeof parsedBody.consentGiven === 'string') {
    parsedBody.consentGiven = parsedBody.consentGiven === 'true';
  }
  
  // Parse number fields
  if (parsedBody.expectedSalaryMin && typeof parsedBody.expectedSalaryMin === 'string') {
    parsedBody.expectedSalaryMin = parseInt(parsedBody.expectedSalaryMin, 10);
  }
  if (parsedBody.expectedSalaryMax && typeof parsedBody.expectedSalaryMax === 'string') {
    parsedBody.expectedSalaryMax = parseInt(parsedBody.expectedSalaryMax, 10);
  }
  if (parsedBody.trainingWillingness && typeof parsedBody.trainingWillingness === 'string') {
    parsedBody.trainingWillingness = parseInt(parsedBody.trainingWillingness, 10);
  }
  if (parsedBody.availableHoursWeek && typeof parsedBody.availableHoursWeek === 'string') {
    parsedBody.availableHoursWeek = parseInt(parsedBody.availableHoursWeek, 10);
  }

  // Ensure user can only create their own KYC
  const body = createIndividualKYCSchema.parse({
    ...parsedBody,
    userId: req.user.id, // Use authenticated user's ID
  });
  
  let profilePhotoUrl: string | undefined;
  let videoKYCUrl: string | undefined;

  // Handle file uploads
  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file, 'hr-platform/kyc/profiles');
    profilePhotoUrl = uploadResult.url;
  }

  if (req.body.videoKYCFile) {
    // Handle video upload if provided
    // This would need to be handled separately as multer doesn't handle base64
  }

  const kyc = await prisma.individualKYC.create({
    data: {
      userId: body.userId,
      fullName: body.fullName,
      gender: body.gender,
      pronouns: body.pronouns,
      dateOfBirth: new Date(body.dateOfBirth),
      nationalId: body.nationalId,
      passportNumber: body.passportNumber,
      country: body.country,
      province: body.province,
      district: body.district,
      municipality: body.municipality,
      ward: body.ward,
      street: body.street,
      city: body.city,
      email: body.email,
      phone: body.phone,
      emergencyContact: body.emergencyContact,
      profilePhotoUrl,
      videoKYCUrl: body.videoIntroUrl || videoKYCUrl,
      highestQualification: body.highestQualification,
      fieldOfStudy: body.fieldOfStudy,
      schoolUniversity: body.schoolUniversity,
      languagesKnown: body.languagesKnown || [],
      externalCertifications: body.externalCertifications,
      employmentStatus: body.employmentStatus,
      experience: body.experience,
      expectedSalaryMin: body.expectedSalaryMin,
      expectedSalaryMax: body.expectedSalaryMax,
      willingRelocate: body.willingRelocate,
      technicalSkills: body.technicalSkills,
      softSkills: body.softSkills,
      physicalSkills: body.physicalSkills,
      interestDomains: body.interestDomains,
      workStylePrefs: body.workStylePrefs,
      psychometricData: body.psychometricData,
      motivationTriggers: body.motivationTriggers,
      learningPrefs: body.learningPrefs,
      trainingWillingness: body.trainingWillingness,
      availableHoursWeek: body.availableHoursWeek,
      careerGoals: body.careerGoals,
      areasImprovement: body.areasImprovement,
      digitalLiteracy: body.digitalLiteracy,
      preferredIndustry: body.preferredIndustry,
      references: body.references,
      portfolioUrls: body.portfolioUrls,
      videoIntroUrl: body.videoIntroUrl,
      socialMediaUrls: body.socialMediaUrls,
      consentGiven: body.consentGiven,
      consentDate: body.consentGiven ? new Date() : null,
    },
  });

  res.status(201).json({
    success: true,
    data: kyc,
  });
};

export const getIndividualKYC = async (req: Request, res: Response) => {
  const { userId } = req.params;

  const kyc = await prisma.individualKYC.findUnique({
    where: { userId },
    include: {
      trainings: {
        include: {
          course: true,
        },
      },
      exams: {
        include: {
          exam: true,
        },
      },
      certifications: true,
      jobApplications: {
        include: {
          job: true,
        },
      },
      employmentHistory: true,
    },
  });

  if (!kyc) {
    res.status(404).json({
      success: false,
      message: 'Individual KYC not found',
    });
    return;
  }

  res.json({
    success: true,
    data: kyc,
  });
};

export const updateIndividualKYC = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { userId } = req.params;

  // Users can only update their own KYC
  if (userId !== req.user.id && req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Access denied' });
    return;
  }

  // Parse FormData fields that might be JSON strings (same as create)
  const parsedBody: any = { ...req.body };
  
  // Parse array fields
  if (typeof parsedBody.languagesKnown === 'string') {
    try {
      parsedBody.languagesKnown = JSON.parse(parsedBody.languagesKnown);
    } catch (e) {}
  }
  if (typeof parsedBody.externalCertifications === 'string') {
    try {
      parsedBody.externalCertifications = JSON.parse(parsedBody.externalCertifications);
    } catch (e) {}
  }
  if (typeof parsedBody.experience === 'string') {
    try {
      parsedBody.experience = JSON.parse(parsedBody.experience);
    } catch (e) {}
  }
  if (typeof parsedBody.technicalSkills === 'string') {
    try {
      parsedBody.technicalSkills = JSON.parse(parsedBody.technicalSkills);
    } catch (e) {}
  }
  if (typeof parsedBody.softSkills === 'string') {
    try {
      parsedBody.softSkills = JSON.parse(parsedBody.softSkills);
    } catch (e) {}
  }
  if (typeof parsedBody.physicalSkills === 'string') {
    try {
      parsedBody.physicalSkills = JSON.parse(parsedBody.physicalSkills);
    } catch (e) {}
  }
  if (typeof parsedBody.interestDomains === 'string') {
    try {
      parsedBody.interestDomains = JSON.parse(parsedBody.interestDomains);
    } catch (e) {}
  }
  if (typeof parsedBody.workStylePrefs === 'string') {
    try {
      parsedBody.workStylePrefs = JSON.parse(parsedBody.workStylePrefs);
    } catch (e) {}
  }
  if (typeof parsedBody.psychometricData === 'string') {
    try {
      parsedBody.psychometricData = JSON.parse(parsedBody.psychometricData);
    } catch (e) {}
  }
  if (typeof parsedBody.motivationTriggers === 'string') {
    try {
      parsedBody.motivationTriggers = JSON.parse(parsedBody.motivationTriggers);
    } catch (e) {}
  }
  if (typeof parsedBody.learningPrefs === 'string') {
    try {
      parsedBody.learningPrefs = JSON.parse(parsedBody.learningPrefs);
    } catch (e) {}
  }
  if (typeof parsedBody.areasImprovement === 'string') {
    try {
      parsedBody.areasImprovement = JSON.parse(parsedBody.areasImprovement);
    } catch (e) {}
  }
  if (typeof parsedBody.references === 'string') {
    try {
      parsedBody.references = JSON.parse(parsedBody.references);
    } catch (e) {}
  }
  if (typeof parsedBody.portfolioUrls === 'string') {
    try {
      parsedBody.portfolioUrls = JSON.parse(parsedBody.portfolioUrls);
    } catch (e) {}
  }
  if (typeof parsedBody.socialMediaUrls === 'string') {
    try {
      parsedBody.socialMediaUrls = JSON.parse(parsedBody.socialMediaUrls);
    } catch (e) {}
  }
  
  // Parse boolean fields
  if (typeof parsedBody.willingRelocate === 'string') {
    parsedBody.willingRelocate = parsedBody.willingRelocate === 'true';
  }
  if (typeof parsedBody.consentGiven === 'string') {
    parsedBody.consentGiven = parsedBody.consentGiven === 'true';
  }
  
  // Parse number fields
  if (parsedBody.expectedSalaryMin && typeof parsedBody.expectedSalaryMin === 'string') {
    parsedBody.expectedSalaryMin = parseInt(parsedBody.expectedSalaryMin, 10);
  }
  if (parsedBody.expectedSalaryMax && typeof parsedBody.expectedSalaryMax === 'string') {
    parsedBody.expectedSalaryMax = parseInt(parsedBody.expectedSalaryMax, 10);
  }
  if (parsedBody.trainingWillingness && typeof parsedBody.trainingWillingness === 'string') {
    parsedBody.trainingWillingness = parseInt(parsedBody.trainingWillingness, 10);
  }
  if (parsedBody.availableHoursWeek && typeof parsedBody.availableHoursWeek === 'string') {
    parsedBody.availableHoursWeek = parseInt(parsedBody.availableHoursWeek, 10);
  }

  // Validate update data
  const body = updateIndividualKYCSchema.parse(parsedBody);

  // Handle profile photo update
  if (req.file) {
    const uploadResult = await uploadToCloudinary(req.file, 'hr-platform/kyc/profiles');
    body.profilePhotoUrl = uploadResult.url;
  }

  const kyc = await prisma.individualKYC.update({
    where: { userId },
    data: {
      ...body,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      consentDate: body.consentGiven ? new Date() : undefined,
    },
  });

  res.json({
    success: true,
    data: kyc,
  });
};

export const getAllIndividualKYC = async (req: Request, res: Response) => {
  const { status, province, district, page = '1', limit = '10' } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const take = Number(limit);

  const where: any = {};
  if (status) where.status = status;
  if (province) where.province = province;
  if (district) where.district = district;

  const [kycs, total] = await Promise.all([
    prisma.individualKYC.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.individualKYC.count({ where }),
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

  const kyc = await prisma.individualKYC.update({
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

