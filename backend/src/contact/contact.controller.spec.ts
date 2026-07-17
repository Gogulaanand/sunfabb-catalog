import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ContactController } from './contact.controller.js';
import { ContactService } from './contact.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';

const dto: CreateContactDto = {
  name: 'Anand',
  phone: '+91 98765 43210',
  email: 'anand@example.com',
  message: 'I would like to know more about bulk towel orders.',
  turnstile_token: 'valid-token',
};

const mockContactService = {
  create: jest.fn(),
};

describe('ContactController', () => {
  let controller: ContactController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactController],
      providers: [{ provide: ContactService, useValue: mockContactService }],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContactController>(ContactController);
  });

  describe('create', () => {
    it('delegates dto and ip to service', async () => {
      const record = { id: 'uuid-1', created_at: new Date() };
      mockContactService.create.mockResolvedValue(record);

      const result = await controller.create(dto, '1.2.3.4');

      expect(result).toEqual(record);
      expect(mockContactService.create).toHaveBeenCalledWith(dto, '1.2.3.4');
    });
  });
});
