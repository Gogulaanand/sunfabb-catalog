import { Controller, Delete, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ImagesService } from './images.service.js';

@Controller('images')
@UseGuards(JwtAuthGuard)
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.imagesService.remove(id);
  }

  @Patch(':id/cover')
  makeCover(@Param('id') id: string) {
    return this.imagesService.makeCover(id);
  }
}
