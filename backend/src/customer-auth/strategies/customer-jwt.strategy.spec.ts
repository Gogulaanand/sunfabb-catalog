import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { CustomerJwtStrategy } from './customer-jwt.strategy.js';
import { PrismaService } from '../../prisma/prisma.service.js';

const mockPrisma = {
  customer: {
    findUnique: jest.fn(),
  },
};

const validPayload = {
  sub: 'cust-1',
  email: 'a@example.com',
  typ: 'customer',
  tokenVersion: 0,
};

describe('CustomerJwtStrategy', () => {
  let strategy: CustomerJwtStrategy;

  beforeAll(() => {
    // getCustomerJwtSecret() fails fast if unset (D31/CLAUDE.md rule 12).
    // Set before the module compiles so the strategy constructor doesn't throw.
    process.env.CUSTOMER_JWT_SECRET =
      'test-secret-for-unit-tests-at-least-32-chars';
  });

  afterAll(() => {
    delete process.env.CUSTOMER_JWT_SECRET;
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerJwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    strategy = module.get<CustomerJwtStrategy>(CustomerJwtStrategy);
  });

  describe('validate — happy path', () => {
    it('returns CurrentCustomerData for an active customer with a matching token version', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        is_active: true,
        token_version: 0,
        email_verified: true,
      });

      const result = await strategy.validate(validPayload);

      expect(result).toEqual({
        customerId: 'cust-1',
        email: 'a@example.com',
        emailVerified: true,
      });
      expect(mockPrisma.customer.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cust-1' } }),
      );
    });

    it('returns emailVerified: false when the customer has not verified their email', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        is_active: true,
        token_version: 0,
        email_verified: false,
      });

      const result = await strategy.validate(validPayload);

      expect(result.emailVerified).toBe(false);
    });
  });

  describe('validate — defence-in-depth token type check', () => {
    it('throws UnauthorizedException immediately if typ is not "customer" (no DB lookup)', async () => {
      await expect(
        strategy.validate({ ...validPayload, typ: 'admin' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      expect(mockPrisma.customer.findUnique).not.toHaveBeenCalled();
    });

    it('throws for an empty typ claim', async () => {
      await expect(
        strategy.validate({ ...validPayload, typ: '' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('validate — D38 M1: immediate deactivation revocation', () => {
    it('throws UnauthorizedException when the customer row does not exist', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue(null);

      await expect(strategy.validate(validPayload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('throws UnauthorizedException when the customer is inactive (is_active=false)', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        is_active: false,
        token_version: 0,
        email_verified: true,
      });

      await expect(strategy.validate(validPayload)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('validate — D38 M2: token_version session revocation after password reset', () => {
    it('throws UnauthorizedException when token_version in JWT is stale (DB has incremented it)', async () => {
      // DB has token_version=1 after a password reset; the JWT still claims 0
      mockPrisma.customer.findUnique.mockResolvedValue({
        is_active: true,
        token_version: 1,
        email_verified: true,
      });

      await expect(
        strategy.validate({ ...validPayload, tokenVersion: 0 }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('accepts a JWT whose tokenVersion matches the current DB value', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({
        is_active: true,
        token_version: 3,
        email_verified: false,
      });

      const result = await strategy.validate({
        ...validPayload,
        tokenVersion: 3,
      });

      expect(result.customerId).toBe('cust-1');
    });
  });
});
