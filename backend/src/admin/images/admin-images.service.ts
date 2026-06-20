import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class AdminImagesService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadImage(buffer: Buffer): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          { folder: 'sunfabb', resource_type: 'image' },
          (error, result) => {
            if (error || !result)
              return reject(new Error(error?.message ?? 'Upload failed'));
            resolve({ url: result.secure_url, public_id: result.public_id });
          },
        )
        .end(buffer);
    });
  }
}
