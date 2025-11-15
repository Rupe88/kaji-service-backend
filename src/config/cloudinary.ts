import { v2 as cloudinary } from 'cloudinary';
import { cloudinaryConfig } from './env';

cloudinary.config({
  cloud_name: cloudinaryConfig.cloudName,
  api_key: cloudinaryConfig.apiKey,
  api_secret: cloudinaryConfig.apiSecret,
});

/**
 * Test Cloudinary connection
 */
export const testCloudinaryConnection = async (): Promise<boolean> => {
  try {
    // Test connection by checking account details
    const result = await cloudinary.api.ping();
    if (result.status === 'ok') {
      console.log('✅ Cloudinary connected successfully');
      console.log(`☁️  Cloud: ${cloudinaryConfig.cloudName}`);
      return true;
    }
    return false;
  } catch (error: any) {
    console.error('❌ Cloudinary connection failed:', error.message || error);
    return false;
  }
};

export default cloudinary;
