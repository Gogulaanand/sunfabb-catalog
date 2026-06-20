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
    create: jest.fn(),
    update: jest.fn(),
  },
  productVariant: {
    create: jest.fn(),
  },
  productImage: {
    create: jest.fn(),
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

  describe('create', () => {
    it('creates a product', async () => {
      const dto = {
        name: 'New Towel',
        slug: 'new-towel',
        category_id: 'cuid-cat-1',
      };
      mockPrisma.product.create.mockResolvedValue({ ...mockProduct, ...dto });

      const result = await service.create(dto);

      expect(result).toEqual({ ...mockProduct, ...dto });
      expect(mockPrisma.product.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('update', () => {
    it('updates a product', async () => {
      const dto = { name: 'Updated Bedspread' };
      mockPrisma.product.update.mockResolvedValue({ ...mockProduct, ...dto });

      const result = await service.update('cuid-1', dto);

      expect(result).toEqual({ ...mockProduct, ...dto });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('soft-deletes a product by setting is_active to false', async () => {
      mockPrisma.product.update.mockResolvedValue({
        ...mockProduct,
        is_active: false,
      });

      const result = await service.remove('cuid-1');

      expect(result).toEqual({ ...mockProduct, is_active: false });
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
        data: { is_active: false },
      });
    });
  });

  describe('addVariant', () => {
    it('creates a variant linked to the product', async () => {
      const dto = {
        material_id: 'cuid-mat-1',
        color_id: 'cuid-col-1',
        size: 'Queen',
        price: 250000,
        stock_quantity: 10,
        sku: 'BED-Q-WHT',
      };
      const created = { id: 'cuid-var-1', product_id: 'cuid-1', ...dto };
      mockPrisma.productVariant.create.mockResolvedValue(created);

      const result = await service.addVariant('cuid-1', dto);

      expect(result).toEqual(created);
      expect(mockPrisma.productVariant.create).toHaveBeenCalledWith({
        data: { ...dto, product_id: 'cuid-1' },
      });
    });
  });

  describe('addImage', () => {
    it('creates an image linked to the product', async () => {
      const dto = { url: 'https://res.cloudinary.com/test/image.jpg' };
      const created = { id: 'cuid-img-1', product_id: 'cuid-1', ...dto };
      mockPrisma.productImage.create.mockResolvedValue(created);

      const result = await service.addImage('cuid-1', dto);

      expect(result).toEqual(created);
      expect(mockPrisma.productImage.create).toHaveBeenCalledWith({
        data: { ...dto, product_id: 'cuid-1' },
      });
    });
  });
});
