import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

const mockCategory = {
  id: 'uuid-1',
  name: 'Bedspreads',
  slug: 'bedspreads',
  description: 'Handcrafted bedspreads',
  image_url: null,
  created_at: new Date('2026-01-01'),
};

const mockCategoriesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('CategoriesController', () => {
  let controller: CategoriesController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        { provide: CategoriesService, useValue: mockCategoriesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CategoriesController>(CategoriesController);
  });

  describe('findAll', () => {
    it('returns all categories', async () => {
      mockCategoriesService.findAll.mockResolvedValue([mockCategory]);

      const result = await controller.findAll();

      expect(result).toEqual([mockCategory]);
      expect(mockCategoriesService.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('findOne', () => {
    it('returns category when found', async () => {
      mockCategoriesService.findOne.mockResolvedValue(mockCategory);

      const result = await controller.findOne('bedspreads');

      expect(result).toEqual(mockCategory);
      expect(mockCategoriesService.findOne).toHaveBeenCalledWith('bedspreads');
    });

    it('throws NotFoundException when category does not exist', async () => {
      mockCategoriesService.findOne.mockResolvedValue(null);

      await expect(controller.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a category', async () => {
      const dto = { name: 'Towels', slug: 'towels' };
      mockCategoriesService.create.mockResolvedValue({
        ...mockCategory,
        ...dto,
      });

      const result = await controller.create(dto);

      expect(result).toEqual({ ...mockCategory, ...dto });
      expect(mockCategoriesService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('update', () => {
    it('updates a category', async () => {
      const dto = { name: 'Updated Bedspreads' };
      mockCategoriesService.update.mockResolvedValue({
        ...mockCategory,
        ...dto,
      });

      const result = await controller.update('uuid-1', dto);

      expect(result).toEqual({ ...mockCategory, ...dto });
      expect(mockCategoriesService.update).toHaveBeenCalledWith('uuid-1', dto);
    });
  });

  describe('remove', () => {
    it('removes a category', async () => {
      mockCategoriesService.remove.mockResolvedValue(mockCategory);

      const result = await controller.remove('uuid-1');

      expect(result).toEqual(mockCategory);
      expect(mockCategoriesService.remove).toHaveBeenCalledWith('uuid-1');
    });
  });
});
