import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.material.findMany({
      orderBy: { name: 'asc' },
    });
  }
}
