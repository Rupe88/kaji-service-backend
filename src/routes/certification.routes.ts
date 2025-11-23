import { Router } from 'express';
import {
  createCertification,
  getCertification,
  verifyCertification,
  getUserCertifications,
  getAllCertifications,
} from '../controllers/certification.controller';
import { uploadFields } from '../middleware/upload';

const router = Router();

router.post('/', uploadFields, createCertification);
router.get('/verify', verifyCertification);
router.get('/user/:userId', getUserCertifications);
router.get('/all', getAllCertifications);
router.get('/:id', getCertification);

export default router;

