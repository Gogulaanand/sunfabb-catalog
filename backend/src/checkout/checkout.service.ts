import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ORDER_CART_INCLUDE, priceCart } from '../orders/order-pricing.js';

export interface QuoteLine {
  variantId: string;
  productName: string;
  variantLabel: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
}

export interface Quote {
  items: QuoteLine[];
  subtotalPaise: number;
  shippingPaise: number;
  taxPaise: number;
  totalPaise: number;
}

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  // Re-reads the caller's server cart, validates every variant is active and in
  // stock, and recomputes the priced quote server-side (D34). Empty cart or an
  // inactive/out-of-stock variant → 400 (thrown by priceCart).
  async quote(customerId: string): Promise<Quote> {
    const cart = await this.prisma.cart.findUnique({
      where: { customer_id: customerId },
      include: ORDER_CART_INCLUDE,
    });

    const priced = priceCart(cart?.items ?? []);

    return {
      items: priced.lines.map((l) => ({
        variantId: l.variantId,
        productName: l.productName,
        variantLabel: l.variantLabel,
        unitPricePaise: l.unitPricePaise,
        quantity: l.quantity,
        lineTotalPaise: l.lineTotalPaise,
      })),
      subtotalPaise: priced.subtotalPaise,
      shippingPaise: priced.shippingPaise,
      taxPaise: priced.taxPaise,
      totalPaise: priced.totalPaise,
    };
  }
}
