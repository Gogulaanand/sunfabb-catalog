import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const CUST_ID = 'cust-1';

function variant(overrides = {}) {
  return {
    id: 'v1',
    price: 5000,
    stock_quantity: 10,
    sku: 'SKU-1',
    size: 'King',
    is_active: true,
    product: { name: 'Royal Bedspread', hsn_code: '6304' },
    material: { name: '100% Cotton' },
    color: { name: 'Indigo' },
    ...overrides,
  };
}

const mockPrisma = {
  cart: { findUnique: jest.fn() },
};

describe('CheckoutService', () => {
  let service: CheckoutService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get<CheckoutService>(CheckoutService);
  });

  it('reads the cart scoped to the caller', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [{ quantity: 1, variant: variant() }],
    });
    await service.quote(CUST_ID);
    expect(mockPrisma.cart.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { customer_id: CUST_ID } }),
    );
  });

  it('throws 400 for an empty cart', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({ id: 'cart-1', items: [] });
    await expect(service.quote(CUST_ID)).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when the customer has no cart yet', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue(null);
    await expect(service.quote(CUST_ID)).rejects.toThrow(BadRequestException);
  });

  it('throws 400 when a variant is inactive', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [{ quantity: 1, variant: variant({ is_active: false }) }],
    });
    await expect(service.quote(CUST_ID)).rejects.toThrow(BadRequestException);
  });

  it('returns a server-recomputed quote with subtotal+shipping+tax = total', async () => {
    mockPrisma.cart.findUnique.mockResolvedValue({
      id: 'cart-1',
      items: [
        { quantity: 2, variant: variant() }, // 10000
        {
          quantity: 1,
          variant: variant({ id: 'v2', price: 2500, sku: 'SKU-2' }),
        }, // 2500
      ],
    });

    const quote = await service.quote(CUST_ID);

    expect(quote.subtotalPaise).toBe(12500);
    expect(quote.shippingPaise).toBe(0);
    expect(quote.taxPaise).toBe(0);
    expect(quote.totalPaise).toBe(12500);
    expect(quote.items).toHaveLength(2);
    // public quote line omits sku/hsn
    expect(quote.items[0]).toEqual({
      variantId: 'v1',
      productName: 'Royal Bedspread',
      variantLabel: 'King · Indigo · 100% Cotton',
      unitPricePaise: 5000,
      quantity: 2,
      lineTotalPaise: 10000,
    });
  });
});
