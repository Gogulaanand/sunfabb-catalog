import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ColorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.color.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
