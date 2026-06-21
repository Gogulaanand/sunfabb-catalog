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
  productVariant: {
    update: jest.fn(),
  },
};

describe('VariantsService', () => {
  let service: VariantsService;

  beforeEach(async () => {
    jest.clearAllMocks();

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
  });
});
