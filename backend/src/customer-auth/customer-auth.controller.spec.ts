import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';
import type { CurrentCustomerData } from './strategies/customer-jwt.strategy.js';

const mockService = {
  register: jest.fn(),
  login: jest.fn(),
  me: jest.fn(),
  verifyEmail: jest.fn(),
  forgotPassword: jest.fn(),
  resetPassword: jest.fn(),
};

const safeCustomer = {
  id: 'cust-1',
  email: 'a@example.com',
  full_name: null,
  phone: null,
  email_verified: false,
};

const currentCustomer: CurrentCustomerData = {
  customerId: 'cust-1',
  email: 'a@example.com',
  emailVerified: false,
};

describe('CustomerAuthController', () => {
  let controller: CustomerAuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CustomerAuthController],
      providers: [{ provide: CustomerAuthService, useValue: mockService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CustomerAuthController>(CustomerAuthController);
  });

  describe('register', () => {
    it('delegates to service and returns auth result', async () => {
      mockService.register.mockResolvedValue({
        access_token: 'tok',
        customer: safeCustomer,
      });

      const result = await controller.register({
        email: 'a@example.com',
        password: 'secret12',
      });

      expect(result).toEqual({ access_token: 'tok', customer: safeCustomer });
      expect(mockService.register).toHaveBeenCalledWith({
        email: 'a@example.com',
        password: 'secret12',
      });
    });

    it('propagates ConflictException from service on duplicate email', async () => {
      mockService.register.mockRejectedValue(
        new ConflictException('Email already registered'),
      );

      await expect(
        controller.register({
          email: 'dupe@example.com',
          password: 'secret12',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('login', () => {
    it('delegates to service and returns auth result', async () => {
      mockService.login.mockResolvedValue({
        access_token: 'tok',
        customer: safeCustomer,
      });

      const result = await controller.login({
        email: 'a@example.com',
        password: 'secret12',
      });

      expect(result).toEqual({ access_token: 'tok', customer: safeCustomer });
      expect(mockService.login).toHaveBeenCalledWith({
        email: 'a@example.com',
        password: 'secret12',
      });
    });

    it('propagates UnauthorizedException from service on bad credentials', async () => {
      mockService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      await expect(
        controller.login({ email: 'bad@example.com', password: 'wrongpass' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('returns ok without delegating to the service (stateless logout)', () => {
      const result = controller.logout();

      expect(result).toEqual({ ok: true });
      // logout is a no-op on the backend — JWT is stateless, the frontend clears its cookie
      Object.values(mockService).forEach((fn) =>
        expect(fn).not.toHaveBeenCalled(),
      );
    });
  });

  describe('me', () => {
    it('calls service.me with the customerId from the JWT principal', async () => {
      mockService.me.mockResolvedValue(safeCustomer);

      const result = await controller.me(currentCustomer);

      expect(result).toEqual(safeCustomer);
      expect(mockService.me).toHaveBeenCalledWith('cust-1');
    });

    it('propagates UnauthorizedException if service cannot find the customer', async () => {
      mockService.me.mockRejectedValue(new UnauthorizedException());

      await expect(controller.me(currentCustomer)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('verifyEmail', () => {
    it('delegates token to service and returns verified result', async () => {
      mockService.verifyEmail.mockResolvedValue({ verified: true });

      const result = await controller.verifyEmail({ token: 'rawtoken' });

      expect(result).toEqual({ verified: true });
      expect(mockService.verifyEmail).toHaveBeenCalledWith('rawtoken');
    });

    it('propagates UnauthorizedException for invalid/expired token', async () => {
      mockService.verifyEmail.mockRejectedValue(
        new UnauthorizedException('Invalid or expired token'),
      );

      await expect(
        controller.verifyEmail({ token: 'expiredtoken' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('forgotPassword', () => {
    it('delegates email to service and returns ok (enumeration-safe response)', async () => {
      mockService.forgotPassword.mockResolvedValue({ ok: true });

      const result = await controller.forgotPassword({
        email: 'a@example.com',
      });

      expect(result).toEqual({ ok: true });
      expect(mockService.forgotPassword).toHaveBeenCalledWith('a@example.com');
    });
  });

  describe('resetPassword', () => {
    it('delegates token and new password to service and returns ok', async () => {
      mockService.resetPassword.mockResolvedValue({ ok: true });

      const result = await controller.resetPassword({
        token: 'rawtoken',
        password: 'newpassword1',
      });

      expect(result).toEqual({ ok: true });
      expect(mockService.resetPassword).toHaveBeenCalledWith(
        'rawtoken',
        'newpassword1',
      );
    });

    it('propagates UnauthorizedException for invalid/expired reset token', async () => {
      mockService.resetPassword.mockRejectedValue(
        new UnauthorizedException('Invalid or expired token'),
      );

      await expect(
        controller.resetPassword({
          token: 'badtoken',
          password: 'newpassword1',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
