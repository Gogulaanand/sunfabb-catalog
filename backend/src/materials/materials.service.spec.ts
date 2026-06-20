import { Test, TestingModule } from '@nestjs/testing';
import { MaterialsService } from './materials.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const mockMaterial = { id: 'cuid-1', name: 'Cotton' };

const mockPrisma = {
  material: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('MaterialsService', () => {
  let service: MaterialsService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MaterialsService>(MaterialsService);
  });

  describe('findAll', () => {
    it('returns all materials ordered by name', async () => {
      mockPrisma.material.findMany.mockResolvedValue([mockMaterial]);

      const result = await service.findAll();

      expect(result).toEqual([mockMaterial]);
      expect(mockPrisma.material.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });

    it('returns empty array when no materials exist', async () => {
      mockPrisma.material.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('creates a material', async () => {
      const dto = { name: 'Linen' };
      mockPrisma.material.create.mockResolvedValue({ id: 'cuid-2', ...dto });

      const result = await service.create(dto);

      expect(result).toEqual({ id: 'cuid-2', ...dto });
      expect(mockPrisma.material.create).toHaveBeenCalledWith({ data: dto });
    });
  });

  describe('update', () => {
    it('updates a material', async () => {
      const dto = { name: 'Egyptian Cotton' };
      mockPrisma.material.update.mockResolvedValue({ ...mockMaterial, ...dto });

      const result = await service.update('cuid-1', dto);

      expect(result).toEqual({ ...mockMaterial, ...dto });
      expect(mockPrisma.material.update).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
        data: dto,
      });
    });
  });

  describe('remove', () => {
    it('deletes a material', async () => {
      mockPrisma.material.delete.mockResolvedValue(mockMaterial);

      const result = await service.remove('cuid-1');

      expect(result).toEqual(mockMaterial);
      expect(mockPrisma.material.delete).toHaveBeenCalledWith({
        where: { id: 'cuid-1' },
      });
    });
  });
});
