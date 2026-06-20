import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';

const mockProduct = {
  id: 'cuid-1',
  name: 'Classic Bedspread',
  slug: 'classic-bedspread',
  description: 'A classic handcrafted bedspread',
  care_instructions: null,
  category_id: 'cuid-cat-1',
  is_active: true,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  category: { name: 'Bedspreads', slug: 'bedspreads' },
  images: [],
  variants: [{ price: 250000 }],
};

const mockPrisma = {
  product: {
    findMany: jest.fn(),
    count: jest.fn(),
    findUnique: jest.fn(),
  },
};

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('findAll', () => {
    it('returns paginated products with defaults', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const dto: FindProductsDto = {};
      const result = await service.findAll(dto);

      expect(result).toEqual({
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
      });
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_active: true },
          skip: 0,
          take: 20,
        }),
      );
    });

    it('filters by categorySlug', async () => {
      mockPrisma.product.findMany.mockResolvedValue([mockProduct]);
      mockPrisma.product.count.mockResolvedValue(1);

      const dto: FindProductsDto = { categorySlug: 'bedspreads' };
      await service.findAll(dto);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { is_active: true, category: { slug: 'bedspreads' } },
        }),
      );
    });

    it('filters by materialId and colorId', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const dto: FindProductsDto = {
        materialId: 'cuid-mat-1',
        colorId: 'cuid-col-1',
      };
      await service.findAll(dto);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            is_active: true,
            variants: {
              some: {
                is_active: true,
                material_id: 'cuid-mat-1',
                color_id: 'cuid-col-1',
              },
            },
          },
        }),
      );
    });

    it('paginates correctly', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      mockPrisma.product.count.mockResolvedValue(0);

      const dto: FindProductsDto = { page: 3, limit: 10 };
      await service.findAll(dto);

      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('sorts by price ascending in application code', async () => {
      const cheap = {
        ...mockProduct,
        id: 'cuid-2',
        variants: [{ price: 100000 }],
      };
      const expensive = {
        ...mockProduct,
        id: 'cuid-3',
        variants: [{ price: 500000 }],
      };
      mockPrisma.product.findMany.mockResolvedValue([expensive, cheap]);

      const dto: FindProductsDto = { sortBy: 'price_asc' };
      const result = await service.findAll(dto);

      expect(result.items).toEqual([cheap, expensive]);
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { is_active: true } }),
      );
      expect(mockPrisma.product.findMany).not.toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: expect.anything() as unknown }),
      );
    });

    it('sorts by price descending and paginates in application code', async () => {
      const cheap = {
        ...mockProduct,
        id: 'cuid-2',
        variants: [{ price: 100000 }],
      };
      const expensive = {
        ...mockProduct,
        id: 'cuid-3',
        variants: [{ price: 500000 }],
      };
      mockPrisma.product.findMany.mockResolvedValue([cheap, expensive]);

      const dto: FindProductsDto = { sortBy: 'price_desc', page: 1, limit: 1 };
      const result = await service.findAll(dto);

      expect(result).toEqual({
        items: [expensive],
        total: 2,
        page: 1,
        limit: 1,
      });
    });
  });

  describe('findOne', () => {
    it('returns product with variants and images when found', async () => {
      const fullProduct = { ...mockProduct, variants: [], images: [] };
      mockPrisma.product.findUnique.mockResolvedValue(fullProduct);

      const result = await service.findOne('classic-bedspread');

      expect(result).toEqual(fullProduct);
      expect(mockPrisma.product.findUnique).toHaveBeenCalledWith({
        where: { slug: 'classic-bedspread' },
        include: expect.objectContaining({
          category: expect.any(Object) as unknown,
          variants: expect.any(Object) as unknown,
          images: expect.any(Object) as unknown,
        }) as unknown,
      });
    });

    it('returns null when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });
});
