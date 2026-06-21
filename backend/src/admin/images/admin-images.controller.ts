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
import { AdminImagesService } from './admin-images.service.js';

@Controller('admin/images')
@UseGuards(JwtAuthGuard)
export class AdminImagesController {
  constructor(private readonly adminImagesService: AdminImagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    return this.adminImagesService.uploadImage(file.buffer);
  }
}
