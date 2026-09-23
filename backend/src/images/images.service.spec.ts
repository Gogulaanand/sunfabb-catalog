import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
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
  image_role: 'GALLERY',
};

const mockPrisma = {
  product: {
    update: jest.fn(),
  },
  productImage: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('ImagesService', () => {
  let service: ImagesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.product.update.mockResolvedValue({ is_active: false });
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma),
    );

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
      mockPrisma.productImage.findUnique.mockResolvedValue(mockImage);
      mockPrisma.productImage.delete.mockResolvedValue(mockImage);

      const result = await service.remove('cuid-img-1');

      expect(result).toEqual(mockImage);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'cuid-img-1' },
      });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('sunfabb/image');
    });

    it('skips the Cloudinary call when public_id is null', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue({
        ...mockImage,
        public_id: null,
      });
      mockPrisma.productImage.delete.mockResolvedValue({
        ...mockImage,
        public_id: null,
      });

      const result = await service.remove('cuid-img-1');

      expect(result.public_id).toBeNull();
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('re-reads after the parent lock before promoting when deleting a cover', async () => {
      const cover = { ...mockImage, is_primary: true };
      mockPrisma.productImage.findUnique
        .mockResolvedValueOnce({ ...mockImage, is_primary: false })
        .mockResolvedValueOnce(cover);
      mockPrisma.productImage.delete.mockResolvedValue(cover);
      mockPrisma.productImage.findFirst.mockResolvedValue({
        ...mockImage,
        id: 'cuid-img-2',
        sort_order: 1,
        is_primary: false,
        public_id: null,
      });

      await service.remove('cuid-img-1');

      expect(mockPrisma.productImage.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.productImage.updateMany).toHaveBeenCalledWith({
        where: { product_id: 'cuid-1', image_role: 'GALLERY' },
        data: { is_primary: false },
      });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
        data: { updated_at: expect.any(Date) as unknown },
        select: { is_active: true },
      });
      expect(
        mockPrisma.product.update.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockPrisma.productImage.findUnique.mock.invocationCallOrder[1],
      );
      expect(
        mockPrisma.productImage.findUnique.mock.invocationCallOrder[1],
      ).toBeLessThan(
        mockPrisma.productImage.updateMany.mock.invocationCallOrder[0],
      );
      expect(mockPrisma.productImage.update).toHaveBeenCalledWith({
        where: { id: 'cuid-img-2' },
        data: { is_primary: true },
      });
    });

    it('rejects deleting the sole gallery cover from an active product', async () => {
      const cover = { ...mockImage, is_primary: true };
      mockPrisma.product.update.mockResolvedValue({ is_active: true });
      mockPrisma.productImage.findUnique.mockResolvedValue(cover);
      mockPrisma.productImage.findFirst.mockResolvedValue(null);

      await expect(service.remove('cuid-img-1')).rejects.toThrow(
        'Cannot delete the only gallery cover for an active product; add another gallery image first',
      );

      expect(mockPrisma.productImage.findFirst).toHaveBeenCalledWith({
        where: {
          product_id: 'cuid-1',
          image_role: 'GALLERY',
          id: { not: 'cuid-img-1' },
        },
        orderBy: [{ sort_order: 'asc' }, { id: 'asc' }],
      });
      expect(mockPrisma.productImage.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.productImage.delete).not.toHaveBeenCalled();
      expect(cloudinary.uploader.destroy).not.toHaveBeenCalled();
    });

    it('allows deleting the sole gallery cover from an inactive product', async () => {
      const cover = { ...mockImage, is_primary: true };
      mockPrisma.product.update.mockResolvedValue({ is_active: false });
      mockPrisma.productImage.findUnique.mockResolvedValue(cover);
      mockPrisma.productImage.findFirst.mockResolvedValue(null);
      mockPrisma.productImage.delete.mockResolvedValue(cover);

      await expect(service.remove('cuid-img-1')).resolves.toEqual(cover);

      expect(mockPrisma.productImage.updateMany).toHaveBeenCalledWith({
        where: { product_id: 'cuid-1', image_role: 'GALLERY' },
        data: { is_primary: false },
      });
      expect(mockPrisma.productImage.delete).toHaveBeenCalledWith({
        where: { id: 'cuid-img-1' },
      });
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('sunfabb/image');
    });

    it('does not promote or clear primaries when deleting a non-cover', async () => {
      const nonPrimary = { ...mockImage, is_primary: false };
      mockPrisma.productImage.findUnique.mockResolvedValue(nonPrimary);
      mockPrisma.productImage.delete.mockResolvedValue(nonPrimary);

      await service.remove('cuid-img-1');

      expect(mockPrisma.productImage.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.productImage.findFirst).not.toHaveBeenCalled();
      expect(mockPrisma.productImage.update).not.toHaveBeenCalled();
    });

    it('returns the committed delete when Cloudinary cleanup fails and logs it', async () => {
      const logger = (
        service as unknown as {
          logger: { error: (...args: unknown[]) => void };
        }
      ).logger;
      const loggerSpy = jest.spyOn(logger, 'error');
      const cleanupError = new Error('Cloudinary unavailable');
      mockPrisma.productImage.findUnique.mockResolvedValue(mockImage);
      mockPrisma.productImage.delete.mockResolvedValue(mockImage);
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(
        cleanupError,
      );

      await expect(service.remove('cuid-img-1')).resolves.toEqual(mockImage);
      expect(loggerSpy).toHaveBeenCalledWith(
        'Cloudinary cleanup failed for image cuid-img-1 (sunfabb/image)',
        cleanupError.stack,
      );
    });

    it('fails before mutation when the image is missing', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrisma.productImage.delete).not.toHaveBeenCalled();
    });

    it('returns not found when the image disappears after acquiring the parent lock', async () => {
      mockPrisma.productImage.findUnique
        .mockResolvedValueOnce(mockImage)
        .mockResolvedValueOnce(null);

      await expect(service.remove('cuid-img-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(mockPrisma.productImage.findUnique).toHaveBeenCalledTimes(2);
      expect(mockPrisma.productImage.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.productImage.delete).not.toHaveBeenCalled();
    });
  });

  describe('makeCover', () => {
    it('clears existing gallery primaries and sets one cover atomically', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue(mockImage);
      mockPrisma.productImage.update.mockResolvedValue({
        ...mockImage,
        is_primary: true,
      });

      await expect(service.makeCover('cuid-img-1')).resolves.toMatchObject({
        id: 'cuid-img-1',
        is_primary: true,
      });
      expect(mockPrisma.productImage.updateMany).toHaveBeenCalledWith({
        where: { product_id: 'cuid-1', image_role: 'GALLERY' },
        data: { is_primary: false },
      });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
        data: { updated_at: expect.any(Date) as unknown },
        select: { id: true },
      });
      expect(
        mockPrisma.product.update.mock.invocationCallOrder[0],
      ).toBeLessThan(
        mockPrisma.productImage.updateMany.mock.invocationCallOrder[0],
      );
      expect(mockPrisma.productImage.update).toHaveBeenCalledWith({
        where: { id: 'cuid-img-1' },
        data: { is_primary: true },
      });
    });

    it('rejects swatches as covers', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue({
        ...mockImage,
        image_role: 'SWATCH',
      });

      await expect(service.makeCover('cuid-img-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(mockPrisma.productImage.updateMany).not.toHaveBeenCalled();
    });

    it('returns not found for an unknown image', async () => {
      mockPrisma.productImage.findUnique.mockResolvedValue(null);

      await expect(service.makeCover('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
