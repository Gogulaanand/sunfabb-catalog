import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { CustomerAuthService } from './customer-auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';

const sha = (raw: string) => createHash('sha256').update(raw).digest('hex');

// Reads the first argument of a mock's first call, typed via an explicit cast
// so the type-checked lint rules stay happy.
function firstArg<T>(fn: jest.Mock): T {
  return (fn.mock.calls[0] as T[])[0];
}

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  emailToken: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
};

const mockJwt = { sign: jest.fn(() => 'signed.jwt.token') };

const mockEmail = {
  sendVerificationEmail: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
};

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerAuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwt },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<CustomerAuthService>(CustomerAuthService);
  });

  describe('register', () => {
    it('lowercases the email, hashes the password, issues a verify token, returns a JWT', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({
        id: 'cust-1',
        email: 'a@example.com',
        full_name: null,
        phone: null,
        email_verified: false,
        is_active: true,
        token_version: 0,
        password_hash: 'ignored',
      });
      mockPrisma.emailToken.create.mockResolvedValue({});

      const result = await service.register({
        email: 'A@Example.com',
        password: 'supersecret',
      });

      const createArg = firstArg<{
        data: { email: string; password_hash: string };
      }>(mockPrisma.customer.create);
      expect(createArg.data.email).toBe('a@example.com');
      expect(createArg.data.password_hash).not.toBe('supersecret');
      expect(
        await bcrypt.compare('supersecret', createArg.data.password_hash),
      ).toBe(true);

      expect(mockPrisma.emailToken.create).toHaveBeenCalledTimes(1);
      expect(mockEmail.sendVerificationEmail).toHaveBeenCalledTimes(1);
      expect(result.access_token).toBe('signed.jwt.token');
      expect(result.customer).not.toHaveProperty('password_hash');
    });

    it('rejects a duplicate email with 409 and never creates a customer', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register({
          email: 'dupe@example.com',
          password: 'supersecret',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(mockPrisma.customer.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns a token for valid credentials', async () => {
      const password_hash = await bcrypt.hash('supersecret', 12);
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        email: 'a@example.com',
        full_name: null,
        phone: null,
        email_verified: true,
        is_active: true,
        token_version: 0,
        password_hash,
      });

      const result = await service.login({
        email: 'a@example.com',
        password: 'supersecret',
      });
      expect(result.access_token).toBe('signed.jwt.token');
    });

    it('rejects an unknown email with the same generic error (no enumeration)', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);
      await expect(
        service.login({ email: 'nope@example.com', password: 'whatever8' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a wrong password', async () => {
      const password_hash = await bcrypt.hash('the-right-one', 12);
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        email: 'a@example.com',
        full_name: null,
        phone: null,
        email_verified: true,
        is_active: true,
        token_version: 0,
        password_hash,
      });
      await expect(
        service.login({ email: 'a@example.com', password: 'the-wrong-one' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects an inactive (anonymised/disabled) account', async () => {
      const password_hash = await bcrypt.hash('supersecret', 12);
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        email: 'a@example.com',
        full_name: null,
        phone: null,
        email_verified: true,
        is_active: false,
        token_version: 0,
        password_hash,
      });
      await expect(
        service.login({ email: 'a@example.com', password: 'supersecret' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('returns ok and sends an email when the account exists', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        id: 'cust-1',
        email: 'a@example.com',
        is_active: true,
      });
      mockPrisma.emailToken.create.mockResolvedValue({});

      const res = await service.forgotPassword('A@Example.com');
      expect(res).toEqual({ ok: true });
      expect(mockEmail.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    });

    it('returns the SAME ok response for an unknown account and sends nothing', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      const res = await service.forgotPassword('ghost@example.com');
      expect(res).toEqual({ ok: true });
      expect(mockEmail.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('token consumption (reset / verify)', () => {
    it('rejects an expired or unmatched reset token (atomic consume matches 0 rows)', async () => {
      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.resetPassword('rawtoken', 'newpassword'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(mockPrisma.customer.update).not.toHaveBeenCalled();

      // Atomic consume gates on used_at: null (+ not-expired), keyed by the
      // sha256 hash of the raw token — never the raw token itself.
      const consume = firstArg<{
        where: { token_hash: string; used_at: null };
      }>(mockPrisma.emailToken.updateMany);
      expect(consume.where.token_hash).toBe(sha('rawtoken'));
      expect(consume.where.used_at).toBeNull();
    });

    it('consumes a valid reset token, updates the password, and invalidates sibling reset tokens', async () => {
      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.emailToken.findFirst.mockResolvedValue({
        customer_id: 'cust-1',
      });
      mockPrisma.customer.update.mockResolvedValue({});

      const res = await service.resetPassword('rawtoken', 'newpassword');
      expect(res).toEqual({ ok: true });
      expect(mockPrisma.customer.update).toHaveBeenCalledTimes(1);
      // updateMany called twice: once to consume the token, once to invalidate
      // any other outstanding reset tokens for the customer (M2).
      expect(mockPrisma.emailToken.updateMany).toHaveBeenCalledTimes(2);
    });

    it('increments token_version on password reset so existing JWTs are immediately revoked (D38)', async () => {
      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.emailToken.findFirst.mockResolvedValue({
        customer_id: 'cust-1',
      });
      mockPrisma.customer.update.mockResolvedValue({});

      await service.resetPassword('rawtoken', 'newpassword');

      const updateArg = firstArg<{
        where: { id: string };
        data: { password_hash: string; token_version: { increment: number } };
      }>(mockPrisma.customer.update);
      expect(updateArg.data.token_version).toEqual({ increment: 1 });
    });

    it('verifies an email with a valid token', async () => {
      mockPrisma.emailToken.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.emailToken.findFirst.mockResolvedValue({
        customer_id: 'cust-1',
      });
      mockPrisma.customer.update.mockResolvedValue({});

      const res = await service.verifyEmail('rawtoken');
      expect(res).toEqual({ verified: true });
      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { email_verified: true } }),
      );
    });
  });
});
