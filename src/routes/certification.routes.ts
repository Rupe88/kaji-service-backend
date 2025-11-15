import { Router } from 'express';
import {
  createCertification,
  getCertification,
  verifyCertification,
  getUserCertifications,
} from '../controllers/certification.controller';
import { uploadFields } from '../middleware/upload';

const router = Router();

router.post('/', uploadFields, createCertification);
router.get('/verify', verifyCertification);
router.get('/user/:userId', getUserCertifications);
router.get('/:id', getCertification);

export default router;

