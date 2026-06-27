import { BadRequestException } from '@nestjs/common';

// Single Prisma include used wherever a cart is priced (quote + order creation),
// so the read shape stays consistent. Pulls the product name + HSN, material and
// colour name needed to build the frozen OrderItem snapshot and the variant label.
export const ORDER_CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: { select: { name: true, hsn_code: true } },
          material: { select: { name: true } },
          color: { select: { name: true } },
        },
      },
    },
  },
} as const;

// Structural shape priceCart() needs — the Prisma result of ORDER_CART_INCLUDE
// is assignable to this. Declared explicitly (rather than a generated payload
// type) so the pure pricing logic is trivial to unit-test with plain objects.
export interface PricingCartItem {
  quantity: number;
  variant: {
    id: string;
    price: number;
    stock_quantity: number;
    sku: string;
    size: string;
    is_active: boolean;
    product: { name: string; hsn_code: string | null };
    material: { name: string };
    color: { name: string };
  };
}

// A priced line. `variantId`, `sku` and `hsnCode` are carried for the order
// snapshot; the public /checkout/quote response omits sku/hsnCode.
export interface PricedLine {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  hsnCode: string | null;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface PricedCart {
  lines: PricedLine[];
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
}

export function variantLabel(variant: PricingCartItem['variant']): string {
  return [variant.size, variant.color.name, variant.material.name]
    .filter(Boolean)
    .join(' · ');
}

// Re-reads price from each ProductVariant at call time (D34 — never trusted from
// the client) and validates availability. Throws 400 on an empty cart, an
// inactive variant, or an out-of-stock variant (stock_quantity must be > 0).
// Totals: subtotal = Σ(unit_price × qty); shipping and tax are 0 placeholders for
// 6.3 (real shipping is 6.6, GST is 6.5); total = subtotal + shipping + tax.
export function priceCart(items: PricingCartItem[]): PricedCart {
  if (items.length === 0) {
    throw new BadRequestException('Cart is empty');
  }

  const lines: PricedLine[] = items.map((item) => {
    const { variant } = item;
    if (!variant.is_active) {
      throw new BadRequestException(
        `${variant.product.name} (${variant.sku}) is no longer available`,
      );
    }
    if (variant.stock_quantity <= 0) {
      throw new BadRequestException(
        `${variant.product.name} (${variant.sku}) is out of stock`,
      );
    }

    const unitPricePaise = variant.price;
    return {
      variantId: variant.id,
      productName: variant.product.name,
      variantLabel: variantLabel(variant),
      sku: variant.sku,
      hsnCode: variant.product.hsn_code,
      unitPricePaise,
      quantity: item.quantity,
      lineTotalPaise: unitPricePaise * item.quantity,
    };
  });

  const subtotalPaise = lines.reduce((sum, l) => sum + l.lineTotalPaise, 0);
  const shippingPaise = 0; // placeholder — Shiprocket rates land in 6.6
  const taxPaise = 0; // placeholder — GST is computed in 6.5
  const totalPaise = subtotalPaise + shippingPaise + taxPaise;

  return { lines, subtotalPaise, shippingPaise, taxPaise, totalPaise };
}
