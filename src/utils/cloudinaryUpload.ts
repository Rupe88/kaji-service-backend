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
  
  // Generate a clean filename from the original name
  // Remove special characters and spaces, keep only alphanumeric, dots, hyphens, underscores
  const cleanFileName = file.originalname
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase();
  
  // Extract extension
  const extension = file.originalname.substring(file.originalname.lastIndexOf('.'));
  const nameWithoutExt = cleanFileName.replace(/\.[^/.]+$/, '');
  
  // Create a unique but readable filename: originalname_timestamp.extension
  // This preserves the original filename while making it unique
  const timestamp = Date.now();
  const uniqueFileName = `${nameWithoutExt}_${timestamp}${extension}`;
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        public_id: uniqueFileName, // Just the filename, folder is handled separately
        use_filename: false, // We're providing our own public_id
        overwrite: false, // Don't overwrite existing files
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
 * 
 * CRITICAL: We CANNOT change /image/upload/ to /raw/upload/ for existing files
 * because the file doesn't exist at that path - it was stored as an image resource.
 * Changing the path causes 404 errors!
 * 
 * Solution: 
 * - Keep original URLs for existing files exactly as they are (they work at /image/upload/ path)
 * - New uploads use resource_type: 'raw' and have correct /raw/upload/ URLs automatically
 * - Remove any transformation flags that might cause access issues (401/403 errors)
 */
export const fixCloudinaryUrlForPdf = (url: string): string => {
  if (!url) return url;
  
  // DO NOT change the path from /image/upload/ to /raw/upload/
  // Files uploaded as images only exist at /image/upload/ path
  
  // Remove any problematic transformation flags that might cause 401/403 errors
  // The fl_attachment flag was causing ERR_INVALID_RESPONSE and HTTP 401 errors
  if (url.includes('fl_attachment')) {
    // Remove fl_attachment flag completely
    url = url.replace('/fl_attachment/', '/').replace('/fl_attachment', '');
    // Clean up any double slashes
    url = url.replace('//', '/');
  }
  
  // Return the clean, original URL without modifications
  return url;
};

