import { Test, TestingModule } from '@nestjs/testing';
import { ImagesController } from './images.controller.js';
import { ImagesService } from './images.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const mockImage = {
  id: 'cuid-img-1',
  product_id: 'cuid-1',
  variant_id: null,
  url: 'https://res.cloudinary.com/test/image.jpg',
  public_id: 'sunfabb/image',
  alt_text: null,
  sort_order: 0,
  is_primary: false,
};

const mockImagesService = {
  remove: jest.fn(),
};

describe('ImagesController', () => {
  let controller: ImagesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImagesController],
      providers: [{ provide: ImagesService, useValue: mockImagesService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ImagesController>(ImagesController);
  });

  describe('remove', () => {
    it('removes an image', async () => {
      mockImagesService.remove.mockResolvedValue(mockImage);

      const result = await controller.remove('cuid-img-1');

      expect(result).toEqual(mockImage);
      expect(mockImagesService.remove).toHaveBeenCalledWith('cuid-img-1');
    });
  });
});
