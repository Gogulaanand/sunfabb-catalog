import { BadRequestException } from '@nestjs/common';
import {
  priceCart,
  variantLabel,
  type PricingCartItem,
} from './order-pricing.js';

function makeItem(
  overrides: {
    quantity?: number;
    variant?: Partial<PricingCartItem['variant']>;
  } = {},
): PricingCartItem {
  return {
    quantity: overrides.quantity ?? 2,
    variant: {
      id: 'v1',
      price: 5000,
      stock_quantity: 10,
      sku: 'SKU-1',
      size: 'King',
      is_active: true,
      product: { name: 'Royal Bedspread', hsn_code: '6304' },
      material: { name: '100% Cotton' },
      color: { name: 'Indigo' },
      ...overrides.variant,
    },
  };
}

describe('order-pricing', () => {
  describe('variantLabel', () => {
    it('joins size · colour · material', () => {
      expect(variantLabel(makeItem().variant)).toBe(
        'King · Indigo · 100% Cotton',
      );
    });
  });

  describe('priceCart', () => {
    it('throws 400 for an empty cart', () => {
      expect(() => priceCart([])).toThrow(BadRequestException);
    });

    it('throws 400 when a variant is inactive', () => {
      const items = [makeItem({ variant: { is_active: false } })];
      expect(() => priceCart(items)).toThrow(BadRequestException);
    });

    it('throws 400 when a variant is out of stock', () => {
      const items = [makeItem({ variant: { stock_quantity: 0 } })];
      expect(() => priceCart(items)).toThrow(BadRequestException);
    });

    it('recomputes subtotal/total from re-read prices; shipping & tax are 0 placeholders', () => {
      const items = [
        makeItem({ quantity: 2 }), // 5000 × 2 = 10000
        makeItem({
          quantity: 1,
          variant: {
            id: 'v2',
            price: 12500,
            stock_quantity: 3,
            sku: 'SKU-2',
            size: 'Queen',
            is_active: true,
            product: { name: 'Linen Throw', hsn_code: null },
            material: { name: 'Linen' },
            color: { name: 'Sand' },
          },
        }), // 12500 × 1 = 12500
      ];

      const result = priceCart(items);

      expect(result.subtotalPaise).toBe(22500);
      expect(result.shippingPaise).toBe(0);
      expect(result.taxPaise).toBe(0);
      expect(result.totalPaise).toBe(22500);
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0]).toMatchObject({
        variantId: 'v1',
        productName: 'Royal Bedspread',
        variantLabel: 'King · Indigo · 100% Cotton',
        sku: 'SKU-1',
        hsnCode: '6304',
        unitPricePaise: 5000,
        quantity: 2,
        lineTotalPaise: 10000,
      });
      expect(result.lines[1]).toMatchObject({
        variantId: 'v2',
        hsnCode: null,
        lineTotalPaise: 12500,
      });
    });
  });
});
