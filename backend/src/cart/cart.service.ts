import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddItemDto } from './dto/add-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';
import { MergeCartDto } from './dto/merge-cart.dto.js';

const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: { select: { id: true, name: true, slug: true } },
          material: { select: { name: true } },
          color: { select: { name: true, hex_code: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  getCart(customerId: string) {
    return this.prisma.cart.upsert({
      where: { customer_id: customerId },
      update: {},
      create: { customer_id: customerId },
      include: CART_INCLUDE,
    });
  }

  async addItem(customerId: string, dto: AddItemDto) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: dto.variantId, is_active: true },
    });
    if (!variant) {
      throw new NotFoundException('Variant not found or inactive');
    }

    const cart = await this.getOrCreateCart(customerId);

    await this.prisma.cartItem.upsert({
      where: {
        cart_id_variant_id: { cart_id: cart.id, variant_id: dto.variantId },
      },
      update: { quantity: { increment: dto.quantity } },
      create: {
        cart_id: cart.id,
        variant_id: dto.variantId,
        quantity: dto.quantity,
      },
    });

    return this.getCart(customerId);
  }

  async updateItem(customerId: string, itemId: string, dto: UpdateItemDto) {
    await this.findOwnedItemOrThrow(customerId, itemId);

    if (dto.quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity: dto.quantity },
      });
    }

    return this.getCart(customerId);
  }

  async removeItem(customerId: string, itemId: string) {
    await this.findOwnedItemOrThrow(customerId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { ok: true as const };
  }

  async mergeCart(customerId: string, dto: MergeCartDto) {
    const cart = await this.getOrCreateCart(customerId);

    for (const item of dto.items) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: item.variantId, is_active: true },
      });
      if (!variant) continue; // silently skip inactive / deleted variants

      await this.prisma.cartItem.upsert({
        where: {
          cart_id_variant_id: { cart_id: cart.id, variant_id: item.variantId },
        },
        update: { quantity: { increment: item.quantity } },
        create: {
          cart_id: cart.id,
          variant_id: item.variantId,
          quantity: item.quantity,
        },
      });
    }

    return this.getCart(customerId);
  }

  private getOrCreateCart(customerId: string) {
    return this.prisma.cart.upsert({
      where: { customer_id: customerId },
      update: {},
      create: { customer_id: customerId },
    });
  }

  // IDOR guard: returns 404 for items that aren't the caller's (same as addresses pattern).
  private async findOwnedItemOrThrow(customerId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { customer_id: customerId },
    });
    if (!cart) throw new NotFoundException('Cart item not found');

    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart_id: cart.id },
    });
    if (!item) throw new NotFoundException('Cart item not found');
    return item;
  }
}
