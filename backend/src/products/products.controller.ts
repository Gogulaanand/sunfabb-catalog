import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() dto: FindProductsDto) {
    return this.productsService.findAll(dto);
  }

  @Get(':slug')
  async findOne(@Param('slug') slug: string) {
    const product = await this.productsService.findOne(slug);
    if (!product) throw new NotFoundException(`Product '${slug}' not found`);
    return product;
  }
}
