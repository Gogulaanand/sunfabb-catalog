import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { AdminEnquiriesController } from './admin-enquiries.controller.js';
import { AdminEnquiriesService } from './admin-enquiries.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdminEnquiriesController],
  providers: [AdminEnquiriesService],
})
export class AdminEnquiriesModule {}
