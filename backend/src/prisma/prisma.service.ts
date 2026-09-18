import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PoolConfig } from 'pg';

const POSTGRES_PROTOCOLS = new Set(['postgres:', 'postgresql:']);
const SUPPORTED_SSL_MODES = new Set(['disable', 'require', 'verify-full']);
const UNSUPPORTED_SSL_MODE_ERROR =
  'DATABASE_URL uses unsupported sslmode; allowed values are disable, require, or verify-full; unsafe modes no-verify and prefer are rejected';

/**
 * Convert the application DATABASE_URL into the explicit pg options used by
 * Prisma's adapter. Keeping this separate makes the security-sensitive
 * connection behavior unit-testable without opening a database connection.
 */
export function createDatabaseConnectionConfig(
  databaseUrl: string | undefined,
): PoolConfig {
  if (!databaseUrl?.trim()) {
    throw new Error('DATABASE_URL is not set');
  }

  let dbUrl: URL;
  try {
    dbUrl = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  }

  if (!POSTGRES_PROTOCOLS.has(dbUrl.protocol)) {
    throw new Error(
      'DATABASE_URL must use the postgres:// or postgresql:// protocol',
    );
  }

  const database = dbUrl.pathname.replace(/^\/+/, '');
  if (!dbUrl.hostname || !database) {
    throw new Error(
      'DATABASE_URL must include a database host and database name',
    );
  }

  const sslmode = dbUrl.searchParams.get('sslmode');
  if (sslmode && !SUPPORTED_SSL_MODES.has(sslmode)) {
    throw new Error(UNSUPPORTED_SSL_MODE_ERROR);
  }

  let user: string;
  let password: string;
  let decodedDatabase: string;
  try {
    user = decodeURIComponent(dbUrl.username);
    password = decodeURIComponent(dbUrl.password);
    decodedDatabase = decodeURIComponent(database);
  } catch {
    throw new Error(
      'DATABASE_URL contains invalid URL-encoded credentials or database name',
    );
  }

  return {
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 5432),
    user,
    password,
    database: decodedDatabase,
    // Do not disable certificate verification. Node's TLS defaults verify the
    // server against trusted CAs and check its hostname when this is true.
    ssl:
      sslmode === 'disable'
        ? false
        : sslmode === 'require' || sslmode === 'verify-full'
          ? { rejectUnauthorized: true }
          : undefined,
  };
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  constructor() {
    const adapter = new PrismaPg(
      createDatabaseConnectionConfig(process.env.DATABASE_URL),
    );
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
  get payment() {
    return this.client.payment;
  }
  get webhookEvent() {
    return this.client.webhookEvent;
  }
  get shipment() {
    return this.client.shipment;
  }

  // Contact enquiries
  get contactMessage() {
    return this.client.contactMessage;
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
