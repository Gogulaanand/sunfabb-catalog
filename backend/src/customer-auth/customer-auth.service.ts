import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { CustomerLoginDto } from './dto/login.dto.js';

// bcryptjs (pure-JS) keeps us off a native build on Render's free tier; cost 12
// is the bcrypt fallback sanctioned by D37 (argon2id preferred but optional).
const BCRYPT_COST = 12;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

// Computed once. login() compares against this when the email is unknown so a
// request always pays bcrypt time — closes the enumeration timing oracle (M4).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  randomBytes(16).toString('hex'),
  BCRYPT_COST,
);

type EmailTokenType = 'VERIFY_EMAIL' | 'PASSWORD_RESET';

export interface SafeCustomer {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  email_verified: boolean;
}

interface CustomerRow extends SafeCustomer {
  is_active: boolean;
  password_hash: string;
}

export interface AuthResult {
  access_token: string;
  customer: SafeCustomer;
}

@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly email: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.customer.findUnique({
      where: { email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const password_hash = await bcrypt.hash(dto.password, BCRYPT_COST);
    const customer = (await this.prisma.customer.create({
      data: {
        email,
        password_hash,
        full_name: dto.full_name ?? null,
        phone: dto.phone ?? null,
      },
    })) as CustomerRow;

    await this.issueEmailToken(
      customer.id,
      'VERIFY_EMAIL',
      VERIFY_TOKEN_TTL_MS,
      (raw) => this.email.sendVerificationEmail(customer.email, raw),
    );

    return {
      access_token: this.signToken(customer.id, customer.email),
      customer: this.toSafe(customer),
    };
  }

  async login(dto: CustomerLoginDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase();
    const customer = (await this.prisma.customer.findUnique({
      where: { email },
    })) as CustomerRow | null;

    // Always run exactly one bcrypt comparison — against the real hash when the
    // account exists and is active, otherwise a dummy — so response time can't
    // distinguish "email exists" from "doesn't" (M4). Message stays generic.
    const hash =
      customer && customer.is_active
        ? customer.password_hash
        : DUMMY_PASSWORD_HASH;
    const ok = await bcrypt.compare(dto.password, hash);

    if (!customer || !customer.is_active || !ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      access_token: this.signToken(customer.id, customer.email),
      customer: this.toSafe(customer),
    };
  }

  async me(customerId: string): Promise<SafeCustomer> {
    const customer = (await this.prisma.customer.findUnique({
      where: { id: customerId },
    })) as CustomerRow | null;
    if (!customer) {
      throw new UnauthorizedException();
    }
    return this.toSafe(customer);
  }

  async verifyEmail(token: string): Promise<{ verified: true }> {
    const record = await this.consumeToken(token, 'VERIFY_EMAIL');
    await this.prisma.customer.update({
      where: { id: record.customer_id },
      data: { email_verified: true },
    });
    return { verified: true };
  }

  // Always returns the same response — no account enumeration.
  async forgotPassword(rawEmail: string): Promise<{ ok: true }> {
    const email = rawEmail.toLowerCase();
    const customer = (await this.prisma.customer.findUnique({
      where: { email },
    })) as CustomerRow | null;
    if (customer && customer.is_active) {
      await this.issueEmailToken(
        customer.id,
        'PASSWORD_RESET',
        RESET_TOKEN_TTL_MS,
        (raw) => this.email.sendPasswordResetEmail(customer.email, raw),
      );
    }
    return { ok: true };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    const record = await this.consumeToken(token, 'PASSWORD_RESET');
    const password_hash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.prisma.customer.update({
      where: { id: record.customer_id },
      data: { password_hash },
    });
    // Invalidate any other outstanding reset tokens for this customer so a
    // second leaked link can't be redeemed after a successful reset (M2,
    // partial — full JWT session revocation is tracked under D38).
    await this.prisma.emailToken.updateMany({
      where: {
        customer_id: record.customer_id,
        type: 'PASSWORD_RESET',
        used_at: null,
      },
      data: { used_at: new Date() },
    });
    return { ok: true };
  }

  // ---- internals ----

  private signToken(sub: string, email: string): string {
    return this.jwtService.sign({ sub, email, typ: 'customer' });
  }

  private toSafe(c: CustomerRow): SafeCustomer {
    return {
      id: c.id,
      email: c.email,
      full_name: c.full_name,
      phone: c.phone,
      email_verified: c.email_verified,
    };
  }

  // Store only a sha256 hash of the token; the raw value goes out by email and
  // is never persisted (D33).
  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private async issueEmailToken(
    customerId: string,
    type: EmailTokenType,
    ttlMs: number,
    send: (rawToken: string) => Promise<void>,
  ): Promise<void> {
    const raw = randomBytes(32).toString('hex');
    await this.prisma.emailToken.create({
      data: {
        customer_id: customerId,
        token_hash: this.hashToken(raw),
        type,
        expires_at: new Date(Date.now() + ttlMs),
      },
    });
    await send(raw);
  }

  // Atomic single-use consume. The used_at write is itself gated on
  // used_at: null AND not-expired, so two concurrent requests can't both redeem
  // the same token — the DB enforces single-use, not a read-then-write (L1).
  private async consumeToken(
    raw: string,
    type: EmailTokenType,
  ): Promise<{ customer_id: string }> {
    const token_hash = this.hashToken(raw);
    const consumed = await this.prisma.emailToken.updateMany({
      where: {
        token_hash,
        type,
        used_at: null,
        expires_at: { gt: new Date() },
      },
      data: { used_at: new Date() },
    });
    if (consumed.count === 0) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const record = (await this.prisma.emailToken.findFirst({
      where: { token_hash, type },
    })) as { customer_id: string } | null;
    if (!record) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    return record;
  }
}
