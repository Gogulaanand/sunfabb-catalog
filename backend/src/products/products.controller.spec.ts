import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
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
  variants: [],
};

const mockProductsService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
};

describe('ProductsController', () => {
  let controller: ProductsController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

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
});
