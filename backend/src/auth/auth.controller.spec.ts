import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AdminLoginThrottlerGuard } from './admin-login-throttler.guard.js';

const mockAuthService = { login: jest.fn() };

describe('AuthController', () => {
  let controller: AuthController;

  const loginHandler = Object.getOwnPropertyDescriptor(
    AuthController.prototype,
    'login',
  )?.value as AuthController['login'];

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      .overrideGuard(AdminLoginThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('protects admin login with the explicit throttler policy', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, loginHandler)).toEqual([
      AdminLoginThrottlerGuard,
    ]);
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', loginHandler)).toBe(5);
    expect(Reflect.getMetadata('THROTTLER:TTLdefault', loginHandler)).toBe(
      60_000,
    );
  });

  it('returns access_token on valid login', async () => {
    mockAuthService.login.mockResolvedValue({ access_token: 'token-123' });

    const result = await controller.login({
      email: 'admin@sunfabb.com',
      password: 'password123',
    });

    expect(result).toEqual({ access_token: 'token-123' });
    expect(mockAuthService.login).toHaveBeenCalledWith({
      email: 'admin@sunfabb.com',
      password: 'password123',
    });
  });

  it('propagates UnauthorizedException from service', async () => {
    mockAuthService.login.mockRejectedValue(new UnauthorizedException());

    await expect(
      controller.login({ email: 'wrong@email.com', password: 'wrongpass' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
