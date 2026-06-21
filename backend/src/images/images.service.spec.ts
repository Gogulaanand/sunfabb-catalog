import { Test, TestingModule } from '@nestjs/testing';
import { ImagesService } from './images.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockImage = {
  id: 'cuid-img-1',
  product_id: 'cuid-1',
  variant_id: null,
  url: 'https://res.cloudinary.com/test/image.jpg',
  alt_text: null,
  sort_order: 0,
  is_primary: false,
};

const mockPrisma = {
  productImage: {
    delete: jest.fn(),
  },
};

describe('ImagesService', () => {
  let service: ImagesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImagesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ImagesService>(ImagesService);
  });

  describe('remove', () => {
    it('deletes an image', async () => {
      mockPrisma.productImage.delete.mockResolvedValue(mockImage);

      const result = await service.remove('cuid-img-1');

      expect(result).toEqual(mockImage);
      expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'cuid-img-1' },
      });
    });
  });
});
