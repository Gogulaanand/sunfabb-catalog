import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import {
  AdminImagesService,
  CloudinaryUploadError,
} from './admin-images.service.js';

const IMAGE_UPLOAD_ERROR_MESSAGE = 'Image upload failed';

export const MAX_IMAGE_UPLOAD_BYTES = 3 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export function imageFileFilter(
  _request: unknown,
  file: Express.Multer.File,
  callback: FileFilterCallback,
) {
  if (
    !ALLOWED_IMAGE_MIME_TYPES.includes(
      file.mimetype as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
    )
  ) {
    callback(new BadRequestException('Choose a JPEG, PNG, or WebP image.'));
    return;
  }

  callback(null, true);
}

@Controller('admin/images')
@UseGuards(JwtAuthGuard)
export class AdminImagesController {
  constructor(private readonly adminImagesService: AdminImagesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES },
      fileFilter: imageFileFilter,
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    try {
      return await this.adminImagesService.uploadImage(file.buffer);
    } catch (err) {
      if (
        err instanceof CloudinaryUploadError &&
        err.httpCode &&
        err.httpCode < 500
      ) {
        throw new BadRequestException(IMAGE_UPLOAD_ERROR_MESSAGE);
      }
      throw err;
    }
  }
}
