import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { Prisma } from '../../generated/prisma/client.js';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is not set');

    // pg 8.21+ treats sslmode=require as verify-full when a connection string is passed.
    // Parsing the URL manually lets us set ssl directly and bypass that. Only enable it when
    // the URL actually asks for it (Neon does; a plain local/CI Postgres doesn't support SSL
    // at all and errors out if we force it).
    const dbUrl = new URL(databaseUrl);
    const adapter = new PrismaPg({
      host: dbUrl.hostname,
      port: parseInt(dbUrl.port || '5432'),
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.slice(1),
      ssl:
        dbUrl.searchParams.get('sslmode') === 'require'
          ? { rejectUnauthorized: false }
          : undefined,
    });
    this.client = new PrismaClient({ adapter });
  }

  get category() {
    return this.client.category;
  }
  get material() {
    return this.client.material;
  }
  get color() {
    return this.client.color;
  }
  get product() {
    return this.client.product;
  }
  get productVariant() {
    return this.client.productVariant;
  }
  get productImage() {
    return this.client.productImage;
  }

  // Phase 6 — e-commerce models
  get customer() {
    return this.client.customer;
  }
  get address() {
    return this.client.address;
  }
  get emailToken() {
    return this.client.emailToken;
  }
  get cart() {
    return this.client.cart;
  }
  get cartItem() {
    return this.client.cartItem;
  }
  get order() {
    return this.client.order;
  }
  get orderItem() {
    return this.client.orderItem;
  }

  // Interactive transaction passthrough. The callback runs against a transaction
  // client (every model delegate, minus connection/transaction control methods),
  // so order creation, stock decrement and cart clearing commit atomically.
  // `options.timeout` (default 5s in Prisma) is exposed because order placement
  // does several sequential round-trips and Neon's pooler latency can exceed 5s.
  $transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { maxWait?: number; timeout?: number },
  ): Promise<T> {
    return this.client.$transaction(fn, options);
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
