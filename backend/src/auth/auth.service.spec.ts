import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
import * as bcrypt from 'bcryptjs';

const mockJwtService = { sign: jest.fn() };

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ADMIN_EMAIL = 'admin@sunfabb.com';
    process.env.ADMIN_PASSWORD_HASH = '$2b$10$hashedpassword';

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: JwtService, useValue: mockJwtService }],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD_HASH;
  });

  it('returns access_token on valid credentials', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    mockJwtService.sign.mockReturnValue('signed-token');

    const result = await service.login({ email: 'admin@sunfabb.com', password: 'password123' });

    expect(result).toEqual({ access_token: 'signed-token' });
    expect(mockJwtService.sign).toHaveBeenCalledWith({ sub: 'admin', email: 'admin@sunfabb.com' });
  });

  it('throws UnauthorizedException on wrong email', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(
      service.login({ email: 'wrong@email.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException on wrong password', async () => {
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ email: 'admin@sunfabb.com', password: 'wrongpassword' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when env vars not configured', async () => {
    delete process.env.ADMIN_EMAIL;
    delete process.env.ADMIN_PASSWORD_HASH;

    await expect(
      service.login({ email: 'admin@sunfabb.com', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
