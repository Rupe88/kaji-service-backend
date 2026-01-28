import { Router } from 'express';
import { certificationController } from '../controllers/certification.controller';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/verify', certificationController.verifyCertification.bind(certificationController));
router.get('/:id', certificationController.getCertificationById.bind(certificationController));
router.get('/user/:userId', certificationController.getUserCertifications.bind(certificationController));

// Admin routes
router.get('/all', authenticate, requireRole('ADMIN'), certificationController.getAllCertifications.bind(certificationController));

export default router;
