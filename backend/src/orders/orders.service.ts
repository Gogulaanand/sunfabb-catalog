import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma, OrderStatus } from '../../generated/prisma/client.js';
import type { CurrentCustomerData } from '../customer-auth/strategies/customer-jwt.strategy.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { ListOrdersDto } from './dto/list-orders.dto.js';
import { ORDER_CART_INCLUDE, priceCart } from './order-pricing.js';
import { financialYear, nextOrderNumber } from './order-number.js';
import { assertTransition } from './order-status.js';

const ORDER_INCLUDE = { items: true } as const;

const MAX_ORDER_NUMBER_RETRIES = 5;

// Order placement does ~6 sequential queries inside one interactive transaction
// (address check, cart read, per-item stock decrement, order-number count, order
// create, cart clear). Prisma's default 5s ceiling is too tight for Neon's pooler
// latency (and free-tier cold starts), so the timeout is raised. At this scale
// (D14) holding a connection for up to 15s is a non-issue.
const ORDER_TRANSACTION_TIMEOUT_MS = 15_000;

// Denormalised address snapshot frozen onto the order. Stored as Json, not an FK,
// so a later edit/delete of the Address never mutates a placed order (§3, D-snapshot).
function snapshotAddress(address: {
  full_name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
}) {
  return {
    full_name: address.full_name,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    country: address.country,
  };
}

// Structural P2002 (unique constraint) check without importing the Prisma error
// class at runtime (keeps this module free of generated-client runtime imports —
// the only unique field generated here is order_number).
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: unknown }).code === 'P2002'
  );
}

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Places an order from the caller's server cart. Everything below commits
  // atomically: address ownership check (IDOR), server-side re-pricing (D34),
  // conditional stock reservation, order + frozen snapshots, and cart clearing.
  // Retries only on an order_number collision; validation errors propagate.
  async create(customer: CurrentCustomerData, dto: CreateOrderDto) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.createInTransaction(tx, customer, dto),
          { timeout: ORDER_TRANSACTION_TIMEOUT_MS },
        );
      } catch (err) {
        if (isUniqueViolation(err) && attempt < MAX_ORDER_NUMBER_RETRIES) {
          continue; // regenerate the order number and retry the whole tx
        }
        throw err;
      }
    }
  }

  private async createInTransaction(
    tx: Prisma.TransactionClient,
    customer: CurrentCustomerData,
    dto: CreateOrderDto,
  ) {
    // 1. Address must belong to the caller. A foreign/missing address is 404
    //    (don't confirm another customer's resource — mirrors the addresses module).
    const address = await tx.address.findFirst({
      where: { id: dto.addressId, customer_id: customer.customerId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }

    // 2. Re-read the cart and recompute prices server-side (D34). Empty cart or
    //    an inactive / out-of-stock variant → 400 (thrown by priceCart).
    const cart = await tx.cart.findUnique({
      where: { customer_id: customer.customerId },
      include: ORDER_CART_INCLUDE,
    });
    const priced = priceCart(cart?.items ?? []);

    // 3. Reserve stock with a conditional decrement so concurrent checkouts can't
    //    oversell, and a variant deactivated since the quote is rejected. Release
    //    on payment failure / cancellation is wired in 6.4.
    for (const line of priced.lines) {
      const { count } = await tx.productVariant.updateMany({
        where: {
          id: line.variantId,
          is_active: true,
          stock_quantity: { gte: line.quantity },
        },
        data: { stock_quantity: { decrement: line.quantity } },
      });
      if (count !== 1) {
        throw new BadRequestException(
          `Insufficient stock for ${line.productName} (${line.sku})`,
        );
      }
    }

    // 4. Allocate the next order number for this financial year (gaps allowed — D36).
    const now = new Date();
    const fyCount = await tx.order.count({
      where: { order_number: { startsWith: `SF-${financialYear(now)}-` } },
    });
    const orderNumber = nextOrderNumber(now, fyCount);

    // 5. Create the order + frozen OrderItem snapshots, then clear the cart.
    const order = await tx.order.create({
      data: {
        order_number: orderNumber,
        customer_id: customer.customerId,
        status: 'PENDING_PAYMENT',
        email: customer.email,
        subtotal_paise: priced.subtotalPaise,
        shipping_paise: priced.shippingPaise,
        tax_paise: priced.taxPaise,
        total_paise: priced.totalPaise,
        shipping_address: snapshotAddress(address),
        items: {
          create: priced.lines.map((line) => ({
            variant_id: line.variantId,
            product_name: line.productName,
            variant_label: line.variantLabel,
            sku: line.sku,
            hsn_code: line.hsnCode,
            unit_price_paise: line.unitPricePaise,
            quantity: line.quantity,
            line_total_paise: line.lineTotalPaise,
          })),
        },
      },
      include: ORDER_INCLUDE,
    });

    if (cart) {
      await tx.cartItem.deleteMany({ where: { cart_id: cart.id } });
    }

    return order;
  }

  // Caller-scoped order list, newest first, paginated (D8 — read params validated).
  async findAll(customerId: string, dto: ListOrdersDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const where = { customer_id: customerId };
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: ORDER_INCLUDE,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total, page, limit };
  }

  // Detail for the caller's own order only. Another customer's order_number
  // returns 404 (not 403 — don't confirm existence; §7.2 IDOR).
  async findOneByNumber(customerId: string, orderNumber: string) {
    const order = await this.prisma.order.findFirst({
      where: { order_number: orderNumber, customer_id: customerId },
      include: ORDER_INCLUDE,
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  // Single status-transition guard. Enforces the §3.2 state machine — an illegal
  // jump throws 400 and is never persisted. Used by payments (6.4) and admin
  // order management (6.8); 6.3 only ever creates at PENDING_PAYMENT.
  async transition(
    order: { id: string; status: OrderStatus },
    next: OrderStatus,
  ) {
    assertTransition(order.status, next);

    const { count } = await this.prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status: next },
    });

    if (count !== 1) {
      const current = await this.prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });
      if (!current) throw new NotFoundException('Order not found');
      throw new ConflictException(
        'Order status changed; refresh the order and try again',
      );
    }

    const updated = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: ORDER_INCLUDE,
    });
    if (!updated) throw new NotFoundException('Order not found');
    return updated;
  }
}
