import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

const mockAuthService = { login: jest.fn() };

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('returns access_token on valid login', async () => {
    mockAuthService.login.mockResolvedValue({ access_token: 'token-123' });

    const result = await controller.login({ email: 'admin@sunfabb.com', password: 'password123' });

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
