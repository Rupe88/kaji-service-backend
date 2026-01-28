import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export class CertificationController {
    /**
     * Get all certifications (Admin only)
     */
    async getAllCertifications(_req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const certifications = await (prisma as any).certification.findMany({
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                    course: {
                        select: {
                            title: true,
                        },
                    },
                },
                orderBy: { issuedAt: 'desc' },
            });

            return res.json({
                success: true,
                data: certifications,
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Get certifications for a specific user
     */
    async getUserCertifications(req: Request, res: Response, next: NextFunction) {
        try {
            const { userId } = req.params;
            const certifications = await (prisma as any).certification.findMany({
                where: { userId },
                include: {
                    course: {
                        select: {
                            title: true,
                        },
                    },
                },
                orderBy: { issuedAt: 'desc' },
            });

            return res.json({
                success: true,
                data: certifications,
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Get certification by ID
     */
    async getCertificationById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const certification = await (prisma as any).certification.findUnique({
                where: { id },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    course: {
                        select: {
                            title: true,
                            description: true,
                        },
                    },
                },
            });

            if (!certification) {
                return res.status(404).json({
                    success: false,
                    message: 'Certification not found',
                });
            }

            return res.json({
                success: true,
                data: certification,
            });
        } catch (error) {
            return next(error);
        }
    }

    /**
     * Verify a certification by code
     */
    async verifyCertification(req: Request, res: Response, next: NextFunction) {
        try {
            const { code } = req.query;
            if (!code) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification code is required',
                });
            }

            const certification = await (prisma as any).certification.findUnique({
                where: { verificationCode: code as string },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                        },
                    },
                    course: {
                        select: {
                            title: true,
                        },
                    },
                },
            });

            if (!certification) {
                return res.status(404).json({
                    success: false,
                    message: 'Invalid verification code',
                    verified: false,
                });
            }

            return res.json({
                success: true,
                message: 'Certification verified successfully',
                verified: true,
                data: certification,
            });
        } catch (error) {
            return next(error);
        }
    }
}

export const certificationController = new CertificationController();
