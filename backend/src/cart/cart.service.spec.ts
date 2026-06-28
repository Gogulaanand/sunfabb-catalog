import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const CART_ID = 'cart-1';
const CUST_ID = 'cust-1';
const ITEM_ID = 'item-1';
const VARIANT_ID = 'variant-1';

const mockCart = {
  id: CART_ID,
  customer_id: CUST_ID,
  created_at: new Date(),
  updated_at: new Date(),
  items: [],
};
const mockVariant = {
  id: VARIANT_ID,
  is_active: true,
  price: 5000,
  stock_quantity: 10,
};
const mockItem = {
  id: ITEM_ID,
  cart_id: CART_ID,
  variant_id: VARIANT_ID,
  quantity: 2,
};

const mockPrisma = {
  cart: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
  },
  cartItem: {
    upsert: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  productVariant: {
    findFirst: jest.fn(),
  },
};

describe('CartService', () => {
  let service: CartService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CartService>(CartService);
  });

  describe('getCart', () => {
    it('scopes the upsert to the caller and returns cart with items', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      const result = await service.getCart(CUST_ID);
      expect(mockPrisma.cart.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customer_id: CUST_ID } }),
      );
      expect(result).toMatchObject({ customer_id: CUST_ID });
    });
  });

  describe('addItem', () => {
    it('throws NotFoundException for an inactive or missing variant', async () => {
      mockPrisma.productVariant.findFirst.mockResolvedValue(null);
      await expect(
        service.addItem(CUST_ID, { variantId: VARIANT_ID, quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('upserts item with increment when variant is active', async () => {
      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.cartItem.upsert.mockResolvedValue(mockItem);

      await service.addItem(CUST_ID, { variantId: VARIANT_ID, quantity: 2 });

      expect(mockPrisma.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            cart_id_variant_id: { cart_id: CART_ID, variant_id: VARIANT_ID },
          },
          update: { quantity: { increment: 2 } },
          create: { cart_id: CART_ID, variant_id: VARIANT_ID, quantity: 2 },
        }),
      );
    });
  });

  describe('updateItem', () => {
    it('throws NotFoundException when item does not belong to caller', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      await expect(
        service.updateItem(CUST_ID, ITEM_ID, { quantity: 3 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deletes the item when quantity is 0', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findFirst.mockResolvedValue(mockItem);
      mockPrisma.cartItem.delete.mockResolvedValue(mockItem);
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);

      await service.updateItem(CUST_ID, ITEM_ID, { quantity: 0 });

      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: ITEM_ID },
      });
      expect(mockPrisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('updates quantity when > 0', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findFirst.mockResolvedValue(mockItem);
      mockPrisma.cartItem.update.mockResolvedValue({
        ...mockItem,
        quantity: 5,
      });
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);

      await service.updateItem(CUST_ID, ITEM_ID, { quantity: 5 });

      expect(mockPrisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: ITEM_ID },
        data: { quantity: 5 },
      });
      expect(mockPrisma.cartItem.delete).not.toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('throws NotFoundException when item does not belong to caller', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findFirst.mockResolvedValue(null);
      await expect(service.removeItem(CUST_ID, ITEM_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deletes the owned item and returns ok', async () => {
      mockPrisma.cart.findUnique.mockResolvedValue(mockCart);
      mockPrisma.cartItem.findFirst.mockResolvedValue(mockItem);
      mockPrisma.cartItem.delete.mockResolvedValue(mockItem);

      const result = await service.removeItem(CUST_ID, ITEM_ID);

      expect(mockPrisma.cartItem.delete).toHaveBeenCalledWith({
        where: { id: ITEM_ID },
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('mergeCart', () => {
    it('skips inactive variants silently — no cartItem.upsert called', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.productVariant.findFirst.mockResolvedValue(null);

      await service.mergeCart(CUST_ID, {
        items: [{ variantId: VARIANT_ID, quantity: 1 }],
      });

      expect(mockPrisma.cartItem.upsert).not.toHaveBeenCalled();
    });

    it('upserts each active variant into the server cart', async () => {
      mockPrisma.cart.upsert.mockResolvedValue(mockCart);
      mockPrisma.productVariant.findFirst.mockResolvedValue(mockVariant);
      mockPrisma.cartItem.upsert.mockResolvedValue(mockItem);

      await service.mergeCart(CUST_ID, {
        items: [{ variantId: VARIANT_ID, quantity: 3 }],
      });

      expect(mockPrisma.cartItem.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { quantity: { increment: 3 } },
          create: { cart_id: CART_ID, variant_id: VARIANT_ID, quantity: 3 },
        }),
      );
    });
  });
});
