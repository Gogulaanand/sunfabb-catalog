import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ColorsService } from './colors.service.js';
import { CreateColorDto } from './dto/create-color.dto.js';
import { UpdateColorDto } from './dto/update-color.dto.js';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  findAll() {
    return this.colorsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateColorDto) {
    return this.colorsService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateColorDto) {
    return this.colorsService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.colorsService.remove(id);
  }
}
