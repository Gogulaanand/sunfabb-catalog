import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ImagesService {
  constructor(private readonly prisma: PrismaService) {}

  remove(id: string) {
    return this.prisma.productImage.delete({ where: { id } });
  }
}
