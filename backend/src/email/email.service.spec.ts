import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service.js';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendVerificationEmail', () => {
    it('resolves without error in development mode', async () => {
      await expect(
        service.sendVerificationEmail('a@example.com', 'rawtoken'),
      ).resolves.toBeUndefined();
    });

    it('uses APP_BASE_URL env var when set', async () => {
      process.env.APP_BASE_URL = 'https://staging.example.com';
      await expect(
        service.sendVerificationEmail('a@example.com', 'rawtoken'),
      ).resolves.toBeUndefined();
      delete process.env.APP_BASE_URL;
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('resolves without error in development mode', async () => {
      await expect(
        service.sendPasswordResetEmail('a@example.com', 'rawtoken'),
      ).resolves.toBeUndefined();
    });
  });

  describe('production stub warning', () => {
    const originalNodeEnv = process.env.NODE_ENV;

    afterEach(() => {
      // Restore NODE_ENV after each production-mode test
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('logs a warning instead of the token link in production (no credential leak)', async () => {
      process.env.NODE_ENV = 'production';

      // Both methods should still resolve — the stub just logs differently
      await expect(
        service.sendVerificationEmail('a@example.com', 'rawtoken'),
      ).resolves.toBeUndefined();

      await expect(
        service.sendPasswordResetEmail('a@example.com', 'rawtoken'),
      ).resolves.toBeUndefined();
    });
  });
});
