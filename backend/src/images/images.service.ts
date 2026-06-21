import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ImagesService {
  constructor(private readonly prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  async remove(id: string) {
    const image = await this.prisma.productImage.delete({ where: { id } });

    if (image.public_id) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    return image;
  }
}
