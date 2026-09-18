import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';
import { AdminEnquiriesService } from './admin-enquiries.service.js';
import { ListAdminEnquiriesDto } from './dto/list-admin-enquiries.dto.js';

@Controller('admin/enquiries')
@UseGuards(JwtAuthGuard)
export class AdminEnquiriesController {
  constructor(private readonly adminEnquiriesService: AdminEnquiriesService) {}

  @Get()
  findAll(@Query() query: ListAdminEnquiriesDto) {
    return this.adminEnquiriesService.findAll(query);
  }
}
