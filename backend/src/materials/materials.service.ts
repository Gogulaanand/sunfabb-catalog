import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMaterialDto } from './dto/create-material.dto.js';
import { UpdateMaterialDto } from './dto/update-material.dto.js';

@Injectable()
export class MaterialsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.material.findMany({
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateMaterialDto) {
    return this.prisma.material.create({ data: dto });
  }

  update(id: string, dto: UpdateMaterialDto) {
    return this.prisma.material.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.material.delete({ where: { id } });
  }
}
