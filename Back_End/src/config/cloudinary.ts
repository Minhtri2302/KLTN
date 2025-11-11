import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || '',
  api_key: process.env.CLOUDINARY_API_KEY || '',
  api_secret: process.env.CLOUDINARY_API_SECRET || '',
});

// Debug: log whether Cloudinary config values are present (do not log secrets)
// const hasCloudName = !!process.env.CLOUDINARY_CLOUD_NAME;
// const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
// console.log(`[cloudinary] cloud_name set: ${hasCloudName}, api_key set: ${hasApiKey}`);

export default cloudinary;
