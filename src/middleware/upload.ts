import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Allow images and videos
  if (
    file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype === 'application/pdf'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only images, videos, and PDF files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});

/**
 * Log Multer configuration on startup
 */
export const logMulterConfig = (): void => {
  console.log('✅ Multer file upload configured');
  console.log(`📁 Max file size: 50MB`);
  console.log(`📄 Allowed types: Images, Videos, PDFs`);
  console.log(`💾 Storage: Memory (buffered)`);
};

export const uploadSingle = upload.single('file');
export const uploadMultiple = upload.array('files', 10);
export const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 },
  { name: 'document', maxCount: 5 },
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'taxClearanceCertificate', maxCount: 1 },
  { name: 'panCertificate', maxCount: 1 },
  { name: 'vatCertificate', maxCount: 1 },
  { name: 'certificate', maxCount: 1 },
  { name: 'practiceVideos', maxCount: 10 },
  { name: 'practicePhotos', maxCount: 10 },
  { name: 'orientationVideos', maxCount: 10 },
  { name: 'orientationPhotos', maxCount: 10 },
]);
