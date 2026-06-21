import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CategoriesService } from './categories.service.js';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const category = await this.categoriesService.findOne(slug);
    if (!category) throw new NotFoundException(`Category '${slug}' not found`);
    return category;
  }
}
