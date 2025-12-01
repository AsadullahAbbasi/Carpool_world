import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
}

/**
 * Upload file to Cloudinary
 */
export async function uploadFile(
  file: Buffer | Uint8Array,
  folder: string,
  options?: {
    width?: number;
    height?: number;
    crop?: string;
    format?: string;
    quality?: string | number;
  }
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const transformation: any[] = [];
    
    // Only add transformation if width/height specified
    if (options?.width || options?.height) {
      transformation.push({
        width: options.width,
        height: options.height,
        crop: options.crop || 'limit', // 'limit' preserves aspect ratio, 'fill' crops
        quality: options.quality || 'auto',
        format: options.format || 'auto',
      });
    } else {
      // Default transformation for avatars
      transformation.push({
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        format: 'auto',
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: transformation,
      },
      (error: any, result: any) => {
        if (error) {
          reject(error);
        } else if (result) {
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        } else {
          reject(new Error('Upload failed'));
        }
      }
    );

    uploadStream.end(file);
  });
}

/**
 * Delete file from Cloudinary
 */
export async function deleteFile(publicId: string): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    throw error;
  }
}

/**
 * Get optimized URL from Cloudinary
 */
export function getOptimizedUrl(publicId: string, options?: {
  width?: number;
  height?: number;
  crop?: string;
}): string {
  return cloudinary.url(publicId, {
    width: options?.width,
    height: options?.height,
    crop: options?.crop || 'fill',
    quality: 'auto',
    format: 'auto',
  });
}