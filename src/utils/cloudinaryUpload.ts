import cloudinary from '../config/cloudinary';
import { UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  resourceType: string;
}

export const uploadToCloudinary = async (
  file: Express.Multer.File,
  folder: string = 'hr-platform'
): Promise<UploadResult> => {
  const startTime = Date.now();
  const fileName = file.originalname;
  
  // Determine resource type based on file MIME type
  let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
  
  // For PDFs and documents, use 'raw' to ensure proper URL generation
  if (file.mimetype === 'application/pdf' || 
      file.mimetype.startsWith('application/') ||
      file.originalname.toLowerCase().endsWith('.pdf')) {
    resourceType = 'raw';
  } else if (file.mimetype.startsWith('video/')) {
    resourceType = 'video';
  } else if (file.mimetype.startsWith('image/')) {
    resourceType = 'image';
  }
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          console.error(`❌ Cloudinary upload failed: ${fileName} - ${error.message}`);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          console.log(`✅ Cloudinary upload success: ${fileName} → ${result.secure_url} (${duration}ms, type: ${result.resource_type})`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            resourceType: result.resource_type,
          });
        } else {
          console.error(`❌ Cloudinary upload failed: ${fileName} - Unknown error`);
          reject(new Error('Unknown error during upload'));
        }
      }
    );

    uploadStream.end(file.buffer);
  });
};

export const uploadMultipleToCloudinary = async (
  files: Express.Multer.File[],
  folder: string = 'hr-platform'
): Promise<UploadResult[]> => {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, folder));
  return Promise.all(uploadPromises);
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Fix Cloudinary URL for PDFs that were incorrectly uploaded as images
 * Converts /image/upload/ URLs to /raw/upload/ for PDF files
 */
export const fixCloudinaryUrlForPdf = (url: string): string => {
  if (!url) return url;
  
  // Check if URL contains /image/upload/ and the file is a PDF
  if (url.includes('/image/upload/') && (url.endsWith('.pdf') || url.includes('.pdf'))) {
    // Replace /image/upload/ with /raw/upload/
    return url.replace('/image/upload/', '/raw/upload/');
  }
  
  return url;
};

