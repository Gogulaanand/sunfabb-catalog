import { Test, TestingModule } from '@nestjs/testing';
import { VariantsService } from './variants.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockVariant = {
  id: 'cuid-var-1',
  product_id: 'cuid-1',
  material_id: 'cuid-mat-1',
  color_id: 'cuid-col-1',
  size: 'Queen',
  price: 250000,
  stock_quantity: 10,
  sku: 'BED-Q-WHT',
  is_active: true,
};

const mockPrisma = {
  product: {
    update: jest.fn(),
  },
  productVariant: {
    findUnique: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('VariantsService', () => {
  let service: VariantsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    mockPrisma.product.update.mockResolvedValue({ is_active: false });
    mockPrisma.productVariant.findUnique.mockResolvedValue(mockVariant);
    mockPrisma.productVariant.count.mockResolvedValue(0);
    mockPrisma.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrisma) => Promise<unknown>) =>
        callback(mockPrisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VariantsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<VariantsService>(VariantsService);
  });

  describe('update', () => {
    it('updates a variant', async () => {
      const dto = { price: 270000 };
      mockPrisma.productVariant.update.mockResolvedValue({
        ...mockVariant,
        ...dto,
      });

      const result = await service.update('cuid-var-1', dto);

      expect(result).toEqual({ ...mockVariant, ...dto });
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
        data: { updated_at: expect.any(Date) as unknown },
        select: { is_active: true },
      });
      expect(mockPrisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'cuid-var-1' },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('soft-deletes a variant by setting is_active to false', async () => {
      mockPrisma.productVariant.update.mockResolvedValue({
        ...mockVariant,
        is_active: false,
      });

      const result = await service.remove('cuid-var-1');

      expect(result).toEqual({ ...mockVariant, is_active: false });
      expect(mockPrisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'cuid-var-1' },
        data: { is_active: false },
      });
    });

    it('rejects making the only sellable variant unavailable on a published product', async () => {
      mockPrisma.product.update.mockResolvedValue({ is_active: true });
      mockPrisma.productVariant.update.mockResolvedValue({
        ...mockVariant,
        stock_quantity: 0,
      });

      await expect(
        service.update('cuid-var-1', { stock_quantity: 0 }),
      ).rejects.toThrow(
        'Cannot make the only sellable variant unavailable while its product is published',
      );

      expect(mockPrisma.productVariant.count).toHaveBeenCalledWith({
        where: {
          product_id: 'cuid-1',
          id: { not: 'cuid-var-1' },
          is_active: true,
          price: { gt: 0 },
          stock_quantity: { gt: 0 },
        },
      });
      expect(mockPrisma.productVariant.update).not.toHaveBeenCalled();
    });

    it('allows making a variant unavailable when another sellable variant exists', async () => {
      mockPrisma.product.update.mockResolvedValue({ is_active: true });
      mockPrisma.productVariant.count.mockResolvedValue(1);
      mockPrisma.productVariant.update.mockResolvedValue({
        ...mockVariant,
        is_active: false,
      });

      await expect(service.remove('cuid-var-1')).resolves.toEqual({
        ...mockVariant,
        is_active: false,
      });

      expect(mockPrisma.productVariant.update).toHaveBeenCalledWith({
        where: { id: 'cuid-var-1' },
        data: { is_active: false },
      });
    });
  });
});
