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
  folder: string = 'service-platform'
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
        public_id: uniqueFileName, // Filename only, folder is handled separately
        use_filename: false, // We're providing our own public_id
        overwrite: false, // Don't overwrite existing files
        access_mode: 'public', // Ensure files are publicly accessible
        // For raw files (PDFs), ensure proper delivery
        ...(resourceType === 'raw' && {
          type: 'upload', // Explicit upload type
          invalidate: true, // Invalidate CDN cache if updating
        }),
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          console.error(`❌ Cloudinary upload failed: ${fileName} - ${error.message}`);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          console.log(`✅ Cloudinary upload success: ${fileName} → ${result.secure_url} (${duration}ms, type: ${result.resource_type})`);
          console.log(`   Public ID: ${result.public_id}, Format: ${result.format || 'N/A'}`);
          
          // IMPORTANT: For PDFs, verify the URL uses /raw/upload/ path
          if (resourceType === 'raw' && result.secure_url && !result.secure_url.includes('/raw/upload/')) {
            console.warn(`⚠️  WARNING: PDF uploaded but URL doesn't use /raw/upload/ path!`);
            console.warn(`   URL: ${result.secure_url}`);
            console.warn(`   This might indicate Cloudinary PDF delivery is disabled in account settings.`);
            console.warn(`   Please enable "Allow delivery of PDF and ZIP files" in Cloudinary Security settings.`);
          }
          
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
  folder: string = 'service-platform'
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
 * IMPORTANT: PDFs uploaded as image resources cannot be accessed directly.
 * The file needs to be re-uploaded with resource_type: 'raw' to work properly.
 * 
 * This function:
 * - Removes problematic transformation flags
 * - Returns the URL as-is (user needs to re-upload the file)
 * - Logs a warning for files that need re-uploading
 */
export const fixCloudinaryUrlForPdf = (url: string): string => {
  if (!url) return url;
  
  // Remove any problematic transformation flags
  if (url.includes('fl_attachment')) {
    url = url.replace('/fl_attachment/', '/').replace('/fl_attachment', '');
    url = url.replace('//', '/');
  }
  
  // Check if this is a PDF uploaded as an image (won't be accessible)
  if (url.includes('/image/upload/') && (url.endsWith('.pdf') || url.includes('.pdf'))) {
    console.warn(`⚠️  PDF uploaded as image resource (not accessible): ${url}`);
    console.warn(`   Solution: Re-upload this file - it will use resource_type: 'raw' automatically`);
  }
  
  return url;
};

/**
 * Check if a Cloudinary URL points to a PDF that was uploaded incorrectly
 * Returns true if the file needs to be re-uploaded
 */
export const needsReupload = (url: string): boolean => {
  if (!url) return false;
  return url.includes('/image/upload/') && (url.endsWith('.pdf') || url.includes('.pdf'));
};

