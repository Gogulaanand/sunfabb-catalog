import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminImagesController } from './admin-images.controller.js';
import { AdminImagesService } from './admin-images.service.js';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard.js';

const mockAdminImagesService = { uploadImage: jest.fn() };

describe('AdminImagesController', () => {
  let controller: AdminImagesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminImagesController],
      providers: [
        { provide: AdminImagesService, useValue: mockAdminImagesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminImagesController>(AdminImagesController);
  });

  it('uploads file and returns url and public_id', async () => {
    const mockResult = {
      url: 'https://res.cloudinary.com/test/image.jpg',
      public_id: 'sunfabb/image',
    };
    mockAdminImagesService.uploadImage.mockResolvedValue(mockResult);

    const mockFile = {
      buffer: Buffer.from('fake-data'),
    } as Express.Multer.File;
    const result = await controller.upload(mockFile);

    expect(result).toEqual(mockResult);
    expect(mockAdminImagesService.uploadImage).toHaveBeenCalledWith(
      mockFile.buffer,
    );
  });

  it('throws BadRequestException when no file provided', () => {
    expect(() =>
      controller.upload(undefined as unknown as Express.Multer.File),
    ).toThrow(BadRequestException);
  });
});
