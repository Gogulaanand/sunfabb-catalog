import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { ContactService } from './contact.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from '../email/email.service.js';
import { TurnstileService } from './turnstile.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';

const dto: CreateContactDto = {
  name: 'Anand',
  phone: '+91 98765 43210',
  email: 'anand@example.com',
  message: 'I would like to know more about bulk towel orders.',
  turnstile_token: 'valid-token',
};

const mockRecord = {
  id: 'uuid-1',
  created_at: new Date('2026-07-16T10:00:00Z'),
};

const mockPrisma = {
  contactMessage: {
    create: jest.fn(),
  },
};

const mockTurnstile = {
  verify: jest.fn(),
};

const mockEmail = {
  sendContactNotification: jest.fn(),
};

describe('ContactService', () => {
  let service: ContactService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TurnstileService, useValue: mockTurnstile },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    service = module.get<ContactService>(ContactService);
  });

  describe('create', () => {
    it('happy path: persists record and sends notification', async () => {
      mockTurnstile.verify.mockResolvedValue(true);
      mockPrisma.contactMessage.create.mockResolvedValue(mockRecord);
      mockEmail.sendContactNotification.mockResolvedValue(undefined);

      const result = await service.create(dto, '1.2.3.4');

      expect(result).toEqual(mockRecord);
      expect(mockPrisma.contactMessage.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          phone: dto.phone,
          email: dto.email,
          message: dto.message,
        },
        select: { id: true, created_at: true },
      });
      expect(mockEmail.sendContactNotification).toHaveBeenCalledWith(
        expect.objectContaining({ id: mockRecord.id, name: dto.name }),
      );
    });

    it('throws ForbiddenException when captcha fails', async () => {
      mockTurnstile.verify.mockResolvedValue(false);

      await expect(service.create(dto)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.contactMessage.create).not.toHaveBeenCalled();
    });

    it('returns record even when email notification throws', async () => {
      mockTurnstile.verify.mockResolvedValue(true);
      mockPrisma.contactMessage.create.mockResolvedValue(mockRecord);
      mockEmail.sendContactNotification.mockRejectedValue(
        new Error('SMTP down'),
      );

      const result = await service.create(dto);

      expect(result).toEqual(mockRecord);
    });

    it('return shape excludes message content', async () => {
      mockTurnstile.verify.mockResolvedValue(true);
      mockPrisma.contactMessage.create.mockResolvedValue(mockRecord);
      mockEmail.sendContactNotification.mockResolvedValue(undefined);

      const result = await service.create(dto);

      expect(result).not.toHaveProperty('message');
      expect(result).not.toHaveProperty('name');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('created_at');
    });
  });
});
