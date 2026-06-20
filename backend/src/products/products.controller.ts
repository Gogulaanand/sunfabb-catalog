import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ProductsService } from './products.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { CreateVariantDto } from './dto/create-variant.dto.js';
import { CreateProductImageDto } from './dto/create-product-image.dto.js';

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

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/variants')
  addVariant(@Param('id') id: string, @Body() dto: CreateVariantDto) {
    return this.productsService.addVariant(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/images')
  addImage(@Param('id') id: string, @Body() dto: CreateProductImageDto) {
    return this.productsService.addImage(id, dto);
  }
}
