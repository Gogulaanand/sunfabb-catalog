import { Module } from '@nestjs/common';
import { AdminImagesController } from './admin-images.controller.js';
import { AdminImagesService } from './admin-images.service.js';

@Module({
  controllers: [AdminImagesController],
  providers: [AdminImagesService],
})
export class AdminImagesModule {}
