import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockCategory = {
  id: 'uuid-1',
  name: 'Bedspreads',
  slug: 'bedspreads',
  description: 'Handcrafted bedspreads',
  image_url: null,
  created_at: new Date('2026-01-01'),
};

const mockPrisma = {
  category: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('CategoriesService', () => {
  let service: CategoriesService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('findAll', () => {
    it('returns all categories ordered by name', async () => {
      mockPrisma.category.findMany.mockResolvedValue([mockCategory]);

      const result = await service.findAll();

      expect(result).toEqual([mockCategory]);
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('returns empty array when no categories exist', async () => {
      mockPrisma.category.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns category when found by slug', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(mockCategory);

      const result = await service.findOne('bedspreads');

      expect(result).toEqual(mockCategory);
      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { slug: 'bedspreads' },
      });
    });

    it('returns null when category does not exist', async () => {
      mockPrisma.category.findUnique.mockResolvedValue(null);

      const result = await service.findOne('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('creates a category', async () => {
      const dto = { name: 'Towels', slug: 'towels' };
      mockPrisma.category.create.mockResolvedValue({ ...mockCategory, ...dto });

      const result = await service.create(dto);

      expect(result).toEqual({ ...mockCategory, ...dto });
      expect(mockPrisma.category.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('update', () => {
    it('updates a category', async () => {
      const dto = { name: 'Updated Bedspreads' };
      mockPrisma.category.update.mockResolvedValue({ ...mockCategory, ...dto });

      const result = await service.update('uuid-1', dto);

      expect(result).toEqual({ ...mockCategory, ...dto });
      expect(mockPrisma.category.update).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('deletes a category', async () => {
      mockPrisma.category.delete.mockResolvedValue(mockCategory);

      const result = await service.remove('uuid-1');

      expect(result).toEqual(mockCategory);
      expect(mockPrisma.category.delete).toHaveBeenCalledWith({
        where: { id: 'uuid-1' },
      });
    });
  });
});
