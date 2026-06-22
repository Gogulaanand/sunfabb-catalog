import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';
import { UpdateAddressDto } from './dto/update-address.dto.js';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(customerId: string) {
    return this.prisma.address.findMany({
      where: { customer_id: customerId },
      orderBy: [{ is_default: 'desc' }, { created_at: 'desc' }],
    });
  }

  async create(customerId: string, dto: CreateAddressDto) {
    if (dto.is_default) {
      await this.clearDefault(customerId);
    }
    return this.prisma.address.create({
      data: {
        customer_id: customerId,
        full_name: dto.full_name,
        phone: dto.phone,
        line1: dto.line1,
        line2: dto.line2 ?? null,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country ?? 'India',
        is_default: dto.is_default ?? false,
      },
    });
  }

  async update(customerId: string, id: string, dto: UpdateAddressDto) {
    await this.findOwnedOrThrow(customerId, id);
    if (dto.is_default) {
      await this.clearDefault(customerId);
    }
    return this.prisma.address.update({ where: { id }, data: { ...dto } });
  }

  async remove(customerId: string, id: string) {
    await this.findOwnedOrThrow(customerId, id);
    await this.prisma.address.delete({ where: { id } });
    return { ok: true };
  }

  // IDOR / BOLA guard: an address that isn't the caller's is reported as 404,
  // not 403 — don't confirm the existence of another customer's resource.
  // Every mutating path runs through this before touching the row.
  private async findOwnedOrThrow(customerId: string, id: string) {
    const address = await this.prisma.address.findFirst({
      where: { id, customer_id: customerId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  private clearDefault(customerId: string) {
    return this.prisma.address.updateMany({
      where: { customer_id: customerId, is_default: true },
      data: { is_default: false },
    });
  }
}
