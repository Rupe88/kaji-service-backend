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
  
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        const duration = Date.now() - startTime;
        
        if (error) {
          console.error(`❌ Cloudinary upload failed: ${fileName} - ${error.message}`);
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
        } else if (result) {
          console.log(`✅ Cloudinary upload success: ${fileName} → ${result.secure_url} (${duration}ms)`);
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

