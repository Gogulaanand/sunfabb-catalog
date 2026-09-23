import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { ListAdminEnquiriesDto } from './dto/list-admin-enquiries.dto.js';

const ENQUIRY_SELECT = {
  id: true,
  name: true,
  phone: true,
  email: true,
  message: true,
  created_at: true,
} as const satisfies Prisma.ContactMessageSelect;

@Injectable()
export class AdminEnquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(dto: ListAdminEnquiriesDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const where: Prisma.ContactMessageWhereInput = { deleted_at: null };

    const [rows, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: ENQUIRY_SELECT,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return {
      enquiries: rows,
      total,
      page,
      limit,
    };
  }
}
