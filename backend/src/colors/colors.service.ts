import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateColorDto } from './dto/create-color.dto.js';
import { UpdateColorDto } from './dto/update-color.dto.js';

@Injectable()
export class ColorsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.color.findMany({
      orderBy: { name: 'asc' },
    });
  }

  create(dto: CreateColorDto) {
    return this.prisma.color.create({ data: dto });
  }

  update(id: string, dto: UpdateColorDto) {
    return this.prisma.color.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.color.delete({ where: { id } });
  }
}
