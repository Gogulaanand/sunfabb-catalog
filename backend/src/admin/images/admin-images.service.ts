import { ConflictException, Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../../prisma/prisma.service.js';

export class CloudinaryUploadError extends Error {
  constructor(
    message: string,
    public readonly httpCode?: number,
  ) {
    super(message);
  }
}

@Injectable()
export class AdminImagesService {
  constructor(private readonly prisma: PrismaService) {
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
              return reject(
                new CloudinaryUploadError(
                  error?.message ?? 'Upload failed',
                  error?.http_code,
                ),
              );
            resolve({ url: result.secure_url, public_id: result.public_id });
          },
        )
        .end(buffer);
    });
  }

  async deleteUploadedImage(publicId: string): Promise<void> {
    const attachedImage = await this.prisma.productImage.findFirst({
      where: { public_id: publicId },
      select: { id: true },
    });
    if (attachedImage) {
      throw new ConflictException('Uploaded image is already attached');
    }

    await cloudinary.uploader.destroy(publicId);
  }
}
