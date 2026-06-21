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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import {
  AdminImagesService,
  CloudinaryUploadError,
} from './admin-images.service.js';

@Controller('admin/images')
@UseGuards(JwtAuthGuard)
export class AdminImagesController {
  constructor(private readonly adminImagesService: AdminImagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
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
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
