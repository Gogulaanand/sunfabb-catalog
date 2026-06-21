import { Test, TestingModule } from '@nestjs/testing';
import { ImagesService } from './images.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: { destroy: jest.fn() },
  },
}));
import { v2 as cloudinary } from 'cloudinary';

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
    it('deletes the image row and destroys the Cloudinary asset', async () => {
      mockPrisma.productImage.delete.mockResolvedValue(mockImage);

      const result = await service.remove('cuid-img-1');

      expect(result).toEqual(mockImage);
      expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'cuid-img-1' },
      });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('sunfabb/image');
    });

    it('skips the Cloudinary call when public_id is null', async () => {
      mockPrisma.productImage.delete.mockResolvedValue({
        ...mockImage,
        public_id: null,
      });

      const result = await service.remove('cuid-img-1');

      expect(result.public_id).toBeNull();
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });
  });
});
