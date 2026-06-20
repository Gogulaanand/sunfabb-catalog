import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { VariantsService } from './variants.service.js';
import { UpdateVariantDto } from './dto/update-variant.dto.js';

@Controller('variants')
@UseGuards(JwtAuthGuard)
export class VariantsController {
  constructor(private readonly variantsService: VariantsService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVariantDto) {
    return this.variantsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.variantsService.remove(id);
  }
}
