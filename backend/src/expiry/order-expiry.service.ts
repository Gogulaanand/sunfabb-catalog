import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { PaymentsService } from '../payments/payments.service.js';

// ORDER_EXPIRY_HOURS controls how long a PENDING_PAYMENT order may sit before
// its reserved stock is released. Defaults to 24 h; must be a positive integer.
// Razorpay's own order.expired webhook fires at 15 min — this cron is the
// belt-and-suspenders fallback for orders that emitted no webhook at all (C9/D41).
function readExpiryHours(): number {
  const raw = process.env.ORDER_EXPIRY_HOURS ?? '24';
  const parsed = parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      `ORDER_EXPIRY_HOURS must be a positive integer; got "${raw}"`,
    );
  }
  return parsed;
}

@Injectable()
export class OrderExpiryService {
  private readonly logger = new Logger(OrderExpiryService.name);
  private readonly expiryHours: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
  ) {
    this.expiryHours = readExpiryHours();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sweepExpiredOrders(): Promise<void> {
    const count = await this.expireNow();
    this.logger.log(
      count === 0
        ? 'Order expiry sweep: none to expire'
        : `Order expiry sweep: expired ${count} order(s)`,
    );
  }

  // Finds all PENDING_PAYMENT orders older than expiryHours and releases each
  // via releaseByOrderId (flips to PAYMENT_FAILED, restores stock, marks
  // Payment FAILED — all in one transaction). Returns the number expired.
  // Also called directly by the admin escape-hatch endpoint (POST /admin/expiry/orders).
  async expireNow(): Promise<number> {
    const cutoff = new Date(Date.now() - this.expiryHours * 3_600_000);
    const stale = await this.prisma.order.findMany({
      where: { status: 'PENDING_PAYMENT', created_at: { lt: cutoff } },
      select: { id: true },
    });
    for (const order of stale) {
      await this.payments.releaseByOrderId(order.id);
    }
    return stale.length;
  }
}
