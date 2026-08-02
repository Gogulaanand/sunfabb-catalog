import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findPublic() {
    const categories = await this.prisma.category.findMany({
      where: {
        products: {
          some: { is_active: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map((category) => ({
      ...category,
      description: null,
    }));
  }

  findOne(slug: string) {
    return this.prisma.category.findUnique({
      where: { slug },
    });
  }

  create(dto: CreateCategoryDto) {
    return this.prisma.category.create({ data: dto });
  }

  update(id: string, dto: UpdateCategoryDto) {
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  remove(id: string) {
    return this.prisma.category.delete({ where: { id } });
  }
}
