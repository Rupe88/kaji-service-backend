import { Request, Response } from 'express';
import prisma from '../config/database';
import {
  uploadToCloudinary,
  fixCloudinaryUrlForPdf,
} from '../utils/cloudinaryUpload';
import { AuthRequest } from '../middleware/auth';
import { individualKYCSchema } from '../utils/kycValidation';
import { updateIndividualKYCSchema } from '../utils/updateValidation';
import {
  getSocketIOInstance,
  emitNotification,
  emitNotificationToAllAdmins,
} from '../config/socket';

const createIndividualKYCSchema = individualKYCSchema;

export const createIndividualKYC = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  // Parse FormData fields that might be JSON strings
  const parsedBody: any = { ...req.body };

  // Ensure country has a default value if not provided
  if (!parsedBody.country || parsedBody.country === '') {
    parsedBody.country = 'Nepal';
  }

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
      parsedBody.externalCertifications = JSON.parse(
        parsedBody.externalCertifications
      );
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
  } else if (
    parsedBody.willingRelocate === undefined ||
    parsedBody.willingRelocate === null
  ) {
    parsedBody.willingRelocate = false; // Default to false if not provided
  }

  if (typeof parsedBody.consentGiven === 'string') {
    parsedBody.consentGiven = parsedBody.consentGiven === 'true';
  } else if (
    parsedBody.consentGiven === undefined ||
    parsedBody.consentGiven === null
  ) {
    parsedBody.consentGiven = false; // Will fail validation if false, but at least it's a boolean
  }

  // Parse number fields - handle empty strings as undefined
  if (
    parsedBody.expectedSalaryMin &&
    typeof parsedBody.expectedSalaryMin === 'string' &&
    parsedBody.expectedSalaryMin !== ''
  ) {
    const num = parseInt(parsedBody.expectedSalaryMin, 10);
    if (!isNaN(num)) {
      parsedBody.expectedSalaryMin = num;
    } else {
      delete parsedBody.expectedSalaryMin;
    }
  } else if (
    parsedBody.expectedSalaryMin === '' ||
    parsedBody.expectedSalaryMin === null
  ) {
    delete parsedBody.expectedSalaryMin;
  }

  if (
    parsedBody.expectedSalaryMax &&
    typeof parsedBody.expectedSalaryMax === 'string' &&
    parsedBody.expectedSalaryMax !== ''
  ) {
    const num = parseInt(parsedBody.expectedSalaryMax, 10);
    if (!isNaN(num)) {
      parsedBody.expectedSalaryMax = num;
    } else {
      delete parsedBody.expectedSalaryMax;
    }
  } else if (
    parsedBody.expectedSalaryMax === '' ||
    parsedBody.expectedSalaryMax === null
  ) {
    delete parsedBody.expectedSalaryMax;
  }

  if (
    parsedBody.trainingWillingness &&
    typeof parsedBody.trainingWillingness === 'string' &&
    parsedBody.trainingWillingness !== ''
  ) {
    const num = parseInt(parsedBody.trainingWillingness, 10);
    if (!isNaN(num)) {
      parsedBody.trainingWillingness = num;
    } else {
      delete parsedBody.trainingWillingness;
    }
  } else if (
    parsedBody.trainingWillingness === '' ||
    parsedBody.trainingWillingness === null
  ) {
    delete parsedBody.trainingWillingness;
  }

  if (
    parsedBody.availableHoursWeek &&
    typeof parsedBody.availableHoursWeek === 'string' &&
    parsedBody.availableHoursWeek !== ''
  ) {
    const num = parseInt(parsedBody.availableHoursWeek, 10);
    if (!isNaN(num)) {
      parsedBody.availableHoursWeek = num;
    } else {
      delete parsedBody.availableHoursWeek;
    }
  } else if (
    parsedBody.availableHoursWeek === '' ||
    parsedBody.availableHoursWeek === null
  ) {
    delete parsedBody.availableHoursWeek;
  }

  // Ensure languagesKnown is an array
  if (
    !parsedBody.languagesKnown ||
    !Array.isArray(parsedBody.languagesKnown) ||
    parsedBody.languagesKnown.length === 0
  ) {
    // If it's missing or empty, this will fail validation, but let's log it
    console.warn(
      'languagesKnown is missing or empty:',
      parsedBody.languagesKnown
    );
  }

  // Ensure user can only create their own KYC
  let body;
  try {
    body = createIndividualKYCSchema.parse({
      ...parsedBody,
      userId: req.user.id, // Use authenticated user's ID
    });
  } catch (error: any) {
    console.error('KYC Validation Error:', error);
    console.error('Parsed Body:', JSON.stringify(parsedBody, null, 2));

    if (error.errors && Array.isArray(error.errors)) {
      const formattedErrors = error.errors.map((e: any) => ({
        path: Array.isArray(e.path) ? e.path : [e.path].filter(Boolean),
        message: e.message,
        code: e.code,
      }));

      const errorMessages = formattedErrors
        .map((e: any) => {
          const field = e.path.length > 0 ? e.path.join('.') : 'unknown';
          return `${field}: ${e.message}`;
        })
        .join(', ');

      res.status(400).json({
        success: false,
        message: `Validation failed: ${errorMessages}`,
        errors: formattedErrors,
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: error.message || 'Validation failed',
      error: error.toString(),
    });
    return;
  }

  let profilePhotoUrl: string | undefined;
  let videoKYCUrl: string | undefined;
  const documentUrls: string[] = [];

  // Handle file uploads - now using uploadFields
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  // Handle profile photo (from 'image' or 'file' field)
  if (files?.image?.[0]) {
    const uploadResult = await uploadToCloudinary(
      files.image[0],
      'hr-platform/kyc/profiles'
    );
    profilePhotoUrl = uploadResult.url;
  } else if (files?.file?.[0]) {
    // Fallback to 'file' field for backward compatibility
    const uploadResult = await uploadToCloudinary(
      files.file[0],
      'hr-platform/kyc/profiles'
    );
    profilePhotoUrl = uploadResult.url;
  }

  // Handle video upload
  if (files?.video?.[0]) {
    const uploadResult = await uploadToCloudinary(
      files.video[0],
      'hr-platform/kyc/videos'
    );
    videoKYCUrl = uploadResult.url;
  }

  // Handle document uploads (multiple documents)
  if (files?.document) {
    for (const doc of files.document) {
      const uploadResult = await uploadToCloudinary(
        doc,
        'hr-platform/kyc/documents'
      );
      documentUrls.push(uploadResult.url);
    }
  }

  // Handle certificate upload
  if (files?.certificate?.[0]) {
    const uploadResult = await uploadToCloudinary(
      files.certificate[0],
      'hr-platform/kyc/certificates'
    );
    documentUrls.push(uploadResult.url);
  }

  // Store documentUrls in externalCertifications if documents were uploaded
  // externalCertifications is a JSON field, so we can add documentUrls to it
  let externalCertifications: any = body.externalCertifications;
  if (documentUrls.length > 0) {
    if (
      externalCertifications &&
      typeof externalCertifications === 'object' &&
      !Array.isArray(externalCertifications)
    ) {
      externalCertifications = {
        ...externalCertifications,
        documentUrls: documentUrls,
      };
    } else if (Array.isArray(externalCertifications)) {
      // If it's an array, wrap it in an object with documentUrls
      externalCertifications = {
        certifications: externalCertifications,
        documentUrls: documentUrls,
      };
    } else {
      externalCertifications = {
        documentUrls: documentUrls,
      };
    }
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
      externalCertifications: externalCertifications as any,
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
    const userName =
      kyc.user.firstName && kyc.user.lastName
        ? `${kyc.user.firstName} ${kyc.user.lastName}`
        : kyc.user.email;

    await emitNotificationToAllAdmins(io, {
      type: 'KYC_SUBMITTED',
      title: 'New Individual KYC Submission',
      message: `${userName} has submitted a new Individual KYC application for review.`,
      data: {
        kycType: 'INDIVIDUAL',
        userId: kyc.userId,
        fullName: kyc.fullName,
        status: kyc.status,
      },
    });
  }

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
      // trainings exists on the schema but the related TrainingCourse model
      // is not present in the current Prisma schema. Avoid nested `course`
      // include and return the enrollments themselves instead.
      trainings: true,
      // exams and certifications are not present on the current schema
      // (models were removed/commented out). Remove nested includes that
      // reference missing relations to keep typechecking happy.
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

  // Fix PDF URLs if they exist (for documentUrls array if stored)
  // Note: documentUrls might not be in the schema yet, but we'll handle it if it exists
  const fixedKyc: any = {
    ...kyc,
  };

  // Check if documentUrls exists in any JSON field or as a direct property
  // Try to extract from externalCertifications or portfolioUrls if stored there
  let documentUrls: string[] = [];

  // Check if documentUrls is stored in externalCertifications
  if (
    kyc.externalCertifications &&
    typeof kyc.externalCertifications === 'object'
  ) {
    const extCerts = kyc.externalCertifications as any;
    if (extCerts.documentUrls && Array.isArray(extCerts.documentUrls)) {
      documentUrls = extCerts.documentUrls;
    }
  }

  // Check if documentUrls exists as a direct property (for future schema updates)
  if ((kyc as any).documentUrls && Array.isArray((kyc as any).documentUrls)) {
    documentUrls = (kyc as any).documentUrls;
  }

  // Fix PDF URLs and add to response
  if (documentUrls.length > 0) {
    fixedKyc.documentUrls = documentUrls.map((url: string) =>
      fixCloudinaryUrlForPdf(url)
    );
  }

  // Set cache-control headers to prevent stale data
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
  });

  console.log('📋 Individual KYC fetched for user:', userId);
  console.log('📋 KYC Status:', fixedKyc.status);
  console.log(
    '📋 Has documentUrls:',
    documentUrls.length > 0
      ? `${documentUrls.length} documents`
      : 'No documents'
  );
  console.log('📋 Full KYC keys:', Object.keys(fixedKyc));

  res.json({
    success: true,
    data: fixedKyc,
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
      parsedBody.externalCertifications = JSON.parse(
        parsedBody.externalCertifications
      );
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
  if (
    parsedBody.expectedSalaryMin &&
    typeof parsedBody.expectedSalaryMin === 'string'
  ) {
    parsedBody.expectedSalaryMin = parseInt(parsedBody.expectedSalaryMin, 10);
  }
  if (
    parsedBody.expectedSalaryMax &&
    typeof parsedBody.expectedSalaryMax === 'string'
  ) {
    parsedBody.expectedSalaryMax = parseInt(parsedBody.expectedSalaryMax, 10);
  }
  if (
    parsedBody.trainingWillingness &&
    typeof parsedBody.trainingWillingness === 'string'
  ) {
    parsedBody.trainingWillingness = parseInt(
      parsedBody.trainingWillingness,
      10
    );
  }
  if (
    parsedBody.availableHoursWeek &&
    typeof parsedBody.availableHoursWeek === 'string'
  ) {
    parsedBody.availableHoursWeek = parseInt(parsedBody.availableHoursWeek, 10);
  }

  // Validate update data
  const body = updateIndividualKYCSchema.parse(parsedBody);

  // Handle file uploads - now using uploadFields
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  // Handle profile photo update
  if (files?.image?.[0]) {
    const uploadResult = await uploadToCloudinary(
      files.image[0],
      'hr-platform/kyc/profiles'
    );
    body.profilePhotoUrl = uploadResult.url;
  } else if (files?.file?.[0]) {
    // Fallback to 'file' field for backward compatibility
    const uploadResult = await uploadToCloudinary(
      files.file[0],
      'hr-platform/kyc/profiles'
    );
    body.profilePhotoUrl = uploadResult.url;
  }

  // Handle video update
  if (files?.video?.[0]) {
    const uploadResult = await uploadToCloudinary(
      files.video[0],
      'hr-platform/kyc/videos'
    );
    // Store video URL - note: updateIndividualKYCSchema may not include videoKYCUrl field
    // If needed, add it to the update schema or handle separately
    (body as any).videoKYCUrl = uploadResult.url;
  }

  // Handle document uploads (multiple documents)
  if (files?.document) {
    for (const doc of files.document) {
      await uploadToCloudinary(doc, 'hr-platform/kyc/documents');
      // Store document URLs if your schema supports it
      // For now, we'll just upload them
    }
  }

  // Handle certificate update
  if (files?.certificate?.[0]) {
    await uploadToCloudinary(
      files.certificate[0],
      'hr-platform/kyc/certificates'
    );
    // Store certificate URL if your schema supports it
  }

  const kyc = await prisma.individualKYC.update({
    where: { userId },
    data: {
      ...body,
      dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : undefined,
      consentDate: body.consentGiven ? new Date() : undefined,
      videoKYCUrl: (body as any).videoKYCUrl || undefined,
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

  // Get current KYC to check if status is changing
  const currentKYC = await prisma.individualKYC.findUnique({
    where: { userId },
    select: { status: true },
  });

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

  // Emit notification if status changed
  const io = getSocketIOInstance();
  if (io && currentKYC && currentKYC.status !== status) {
    let title = 'KYC Status Updated';
    let message = `Your Individual KYC has been ${status}`;

    if (status === 'APPROVED') {
      title = 'KYC Approved! 🎉';
      message =
        'Congratulations! Your Individual KYC has been approved. You can now access all features.';
    } else if (status === 'REJECTED') {
      title = 'KYC Rejected';
      message = rejectionReason
        ? `Your Individual KYC was rejected: ${rejectionReason}`
        : 'Your Individual KYC was rejected. Please review and resubmit.';
    } else if (status === 'RESUBMITTED') {
      title = 'KYC Resubmitted';
      message = 'Your Individual KYC has been resubmitted and is under review.';
    }

    await emitNotification(io, userId, {
      type: 'KYC_STATUS',
      title,
      message,
      data: {
        kycType: 'INDIVIDUAL',
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

export const deleteIndividualKYC = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  const { userId } = req.params;

  // Users can only delete their own KYC
  if (req.user.id !== userId) {
    res
      .status(403)
      .json({ success: false, message: 'You can only delete your own KYC' });
    return;
  }

  // Check if KYC exists
  const kyc = await prisma.individualKYC.findUnique({
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
      message:
        'Cannot delete approved KYC. Please contact admin if you need to make changes.',
    });
    return;
  }

  // Delete the KYC
  await prisma.individualKYC.delete({
    where: { userId },
  });

  res.json({
    success: true,
    message: 'KYC deleted successfully',
  });
};
