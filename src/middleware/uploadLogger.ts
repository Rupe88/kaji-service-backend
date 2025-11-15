import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to log file upload information
 */
export const uploadLogger = (req: Request, _res: Response, next: NextFunction) => {
  // Log single file upload
  if (req.file) {
    const file = req.file;
    console.log(`📤 File upload: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB) - Type: ${file.mimetype}`);
  }

  // Log multiple files upload
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach((file: Express.Multer.File) => {
        console.log(`📤 File upload: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB) - Type: ${file.mimetype}`);
      });
    } else {
      // Handle fields object
      Object.keys(req.files).forEach((fieldname) => {
        const files = (req.files as { [fieldname: string]: Express.Multer.File[] })[fieldname];
        files.forEach((file: Express.Multer.File) => {
          console.log(`📤 File upload [${fieldname}]: ${file.originalname} (${(file.size / 1024 / 1024).toFixed(2)}MB) - Type: ${file.mimetype}`);
        });
      });
    }
  }

  next();
};

