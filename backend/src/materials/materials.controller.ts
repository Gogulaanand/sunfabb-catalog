import { Controller, Get } from '@nestjs/common';
import { MaterialsService } from './materials.service.js';

@Controller('materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  findAll() {
    return this.materialsService.findAll();
  }
}
