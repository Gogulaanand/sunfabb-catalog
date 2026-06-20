import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

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
  variants: [],
};

const mockProductsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addVariant: jest.fn(),
  addImage: jest.fn(),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  describe('findAll', () => {
    it('returns paginated products', async () => {
      const paginatedResult = {
        items: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockProductsService.findAll.mockResolvedValue(paginatedResult);

      const dto: FindProductsDto = {};
      const result = await controller.findAll(dto);

      expect(result).toEqual(paginatedResult);
      expect(mockProductsService.findAll).toHaveBeenCalledWith(dto);
    });
  });

  describe('findOne', () => {
    it('returns product when found', async () => {
      mockProductsService.findOne.mockResolvedValue(mockProduct);

      const result = await controller.findOne('classic-bedspread');

      expect(result).toEqual(mockProduct);
      expect(mockProductsService.findOne).toHaveBeenCalledWith(
        'classic-bedspread',
      );
    });

    it('throws NotFoundException when product does not exist', async () => {
      mockProductsService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a product', async () => {
      const dto = {
        name: 'New Towel',
        slug: 'new-towel',
        category_id: 'cuid-cat-1',
      };
      mockProductsService.create.mockResolvedValue({ ...mockProduct, ...dto });

      const result = await controller.create(dto);

      expect(result).toEqual({ ...mockProduct, ...dto });
      expect(mockProductsService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('updates a product', async () => {
      const dto = { name: 'Updated Bedspread' };
      mockProductsService.update.mockResolvedValue({ ...mockProduct, ...dto });

      const result = await controller.update('cuid-1', dto);

      expect(result).toEqual({ ...mockProduct, ...dto });
      expect(mockProductsService.update).toHaveBeenCalledWith('cuid-1', dto);
    });
  });

  describe('remove', () => {
    it('removes a product', async () => {
      mockProductsService.remove.mockResolvedValue({
        ...mockProduct,
        is_active: false,
      });

      const result = await controller.remove('cuid-1');

      expect(result).toEqual({ ...mockProduct, is_active: false });
      expect(mockProductsService.remove).toHaveBeenCalledWith('cuid-1');
    });
  });

  describe('addVariant', () => {
    it('adds a variant to the product', async () => {
      const dto = {
        material_id: 'cuid-mat-1',
        color_id: 'cuid-col-1',
        size: 'Queen',
        price: 250000,
        stock_quantity: 10,
        sku: 'BED-Q-WHT',
      };
      const created = { id: 'cuid-var-1', product_id: 'cuid-1', ...dto };
      mockProductsService.addVariant.mockResolvedValue(created);

      const result = await controller.addVariant('cuid-1', dto);

      expect(result).toEqual(created);
      expect(mockProductsService.addVariant).toHaveBeenCalledWith(
        'cuid-1',
        dto,
      );
    });
  });

  describe('addImage', () => {
    it('adds an image to the product', async () => {
      const dto = { url: 'https://res.cloudinary.com/test/image.jpg' };
      const created = { id: 'cuid-img-1', product_id: 'cuid-1', ...dto };
      mockProductsService.addImage.mockResolvedValue(created);

      const result = await controller.addImage('cuid-1', dto);

      expect(result).toEqual(created);
      expect(mockProductsService.addImage).toHaveBeenCalledWith('cuid-1', dto);
    });
  });
});
