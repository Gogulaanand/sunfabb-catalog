import { Controller, Get } from '@nestjs/common';
import { ColorsService } from './colors.service.js';

@Controller('colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  findAll() {
    return this.colorsService.findAll();
  }
}
