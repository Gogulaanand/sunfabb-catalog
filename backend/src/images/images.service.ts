import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductImageRole } from '../../generated/prisma/enums.js';

@Injectable()
export class ImagesService {
  private readonly logger = new Logger(ImagesService.name);

  constructor(private readonly prisma: PrismaService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Selects one gallery image as the product cover in a single transaction.
   * Swatches are deliberately excluded because they are variant metadata and
   * never a public product image.
   */
  async makeCover(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const image = await tx.productImage.findUnique({ where: { id } });

      if (!image) throw new NotFoundException('Image not found');
      if (image.image_role !== ProductImageRole.GALLERY) {
        throw new BadRequestException('Only gallery images can be a cover');
      }

      await tx.product.update({
        where: { id: image.product_id },
        data: { updated_at: new Date() },
        select: { id: true },
      });

      await tx.productImage.updateMany({
        where: {
          product_id: image.product_id,
          image_role: ProductImageRole.GALLERY,
        },
        data: { is_primary: false },
      });

      return tx.productImage.update({
        where: { id },
        data: { is_primary: true },
      });
    });
  }

  async remove(id: string) {
    const { image } = await this.prisma.$transaction(async (tx) => {
      const imageBeforeLock = await tx.productImage.findUnique({
        where: { id },
      });
      if (!imageBeforeLock) throw new NotFoundException('Image not found');

      // Take the same parent-row lock as makeCover and addImage before any
      // delete/promotion work. This serializes the complete cover lifecycle
      // across all three admin paths.
      const product = await tx.product.update({
        where: { id: imageBeforeLock.product_id },
        data: { updated_at: new Date() },
        select: { is_active: true },
      });

      // The image read above may have happened before another cover mutation
      // acquired the parent lock. Re-read after the lock so deletion and
      // promotion use the committed state, not a stale is_primary value.
      const image = await tx.productImage.findUnique({ where: { id } });
      if (!image) throw new NotFoundException('Image not found');

      const deletingCover =
        image.image_role === ProductImageRole.GALLERY && image.is_primary;
      const promoted = deletingCover
        ? await tx.productImage.findFirst({
            where: {
              product_id: image.product_id,
              image_role: ProductImageRole.GALLERY,
              id: { not: id },
            },
            orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
          })
        : null;

      if (deletingCover && product.is_active && !promoted) {
        throw new BadRequestException(
          'Cannot delete the only gallery cover for an active product; add another gallery image first',
        );
      }

      // Clear the product's old cover before deleting it. This also repairs a
      // malformed pre-existing state with multiple primaries while the cover
      // is being replaced.
      if (deletingCover) {
        await tx.productImage.updateMany({
          where: {
            product_id: image.product_id,
            image_role: ProductImageRole.GALLERY,
          },
          data: { is_primary: false },
        });
      }

      await tx.productImage.delete({ where: { id } });

      if (promoted) {
        await tx.productImage.update({
          where: { id: promoted.id },
          data: { is_primary: true },
        });
      }

      return { image, promoted };
    });

    if (image.public_id) {
      try {
        await cloudinary.uploader.destroy(image.public_id);
      } catch (error) {
        // The database mutation is already committed. A CDN cleanup retry can
        // be handled independently and must not make the admin action appear
        // to have failed after the image row was removed.
        this.logger.error(
          `Cloudinary cleanup failed for image ${image.id} (${image.public_id})`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return image;
  }
}
